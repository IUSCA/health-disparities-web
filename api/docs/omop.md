```sql
-- Materialized Views for full text search for concept_name
create materialized view if not exists concept_metadata as WITH RECURSIVE ancestors AS (
    -- Base case: Select direct relationships
    SELECT
        cr.concept_id_1 AS child_id,
        cr.concept_id_2 AS parent_id,
        c1.concept_code AS child_code,
        c2.concept_code AS parent_code,
        1 as level
    FROM
        concept_relationship cr
        JOIN concept c1 ON cr.concept_id_1 = c1.concept_id
        JOIN concept c2 ON cr.concept_id_2 = c2.concept_id
    WHERE
        c1.vocabulary_id = 'ICD10'
        AND c2.vocabulary_id = 'ICD10'
        AND cr.relationship_id = 'Is a'
    UNION
    ALL -- Recursive case: Join with the Ancestors CTE
    SELECT
        a.child_id,
        cr.concept_id_2 AS parent_id,
        a.child_code,
        c2.concept_code AS parent_code,
        a.level + 1 as level
    FROM
        Ancestors a
        JOIN concept_relationship cr ON a.parent_id = cr.concept_id_1
        JOIN concept c2 ON cr.concept_id_2 = c2.concept_id
    WHERE
        c2.vocabulary_id = 'ICD10'
        AND cr.relationship_id = 'Is a'
),
distinct_ancestors AS (
    -- there are duplicate (child_id, parent_id) because M "ICD10 code"s have two parents. 
    -- see select * from concept_relationship cr where cr.concept_id_1 = 42616305;
    -- so we group by child_id, parent_id and select one with maximum value to preserve the longest parent chain
    SELECT
        child_id,
        parent_id,
        MAX(level) AS max_level
    FROM
        ancestors
    GROUP BY
        child_id,
        parent_id
),
nodes as (
    SELECT
        da.child_id as id,
        array_agg(
            parent_id
            ORDER BY
                max_level DESC
        ) || da.child_id as path
    FROM
        distinct_ancestors da
    GROUP BY
        da.child_id
)
select
    id,
    array_to_string(path, '.') :: ltree as path,
    to_tsvector('english', coalesce(c.concept_name, '')) as text_searchable_index_col
from
    nodes
    join concept c on c.concept_id = nodes.id;
```

This query represents a multi-step process to establish and process hierarchical relationships between concepts in a database. Here's a breakdown of each stage:

### 1. **Base Case: Select Direct Relationships**
   ```sql
   SELECT
       cr.concept_id_1 AS child_id,
       cr.concept_id_2 AS parent_id,
       c1.concept_code AS child_code,
       c2.concept_code AS parent_code,
       1 as level
   FROM
       concept_relationship cr
       JOIN concept c1 ON cr.concept_id_1 = c1.concept_id
       JOIN concept c2 ON cr.concept_id_2 = c2.concept_id
   WHERE
       c1.vocabulary_id = 'ICD10'
       AND c2.vocabulary_id = 'ICD10'
       AND cr.relationship_id = 'Is a'
   ```
   - **Purpose**: Start by selecting direct "Is a" relationships between concepts.
   - **Details**:
     - `concept_id_1` is treated as the child, and `concept_id_2` as the parent.
     - Only relationships where both concepts belong to the `ICD10` vocabulary are considered.
     - A column `level` is initialized as `1` to indicate the direct parent-child relationship's depth.

---

### 2. **Recursive Case: Join with the Ancestors CTE**
   ```sql
   UNION
   ALL
   SELECT
       a.child_id,
       cr.concept_id_2 AS parent_id,
       a.child_code,
       c2.concept_code AS parent_code,
       a.level + 1 as level
   FROM
       Ancestors a
       JOIN concept_relationship cr ON a.parent_id = cr.concept_id_1
       JOIN concept c2 ON cr.concept_id_2 = c2.concept_id
   WHERE
       c2.vocabulary_id = 'ICD10'
       AND cr.relationship_id = 'Is a'
   ```
   - **Purpose**: Traverse the hierarchy recursively to identify all ancestor relationships.
   - **Details**:
     - Each parent from the base case (`a.parent_id`) is treated as a new child to find its parent in the next recursive step.
     - The `level` column increments to track the hierarchy depth.
   - **Output**: A list of all child-parent relationships, extended to all ancestors, with their respective levels.

---

### 3. **Deduplicate Relationships: `distinct_ancestors` CTE**
   ```sql
   SELECT
       child_id,
       parent_id,
       MAX(level) AS max_level
   FROM
       ancestors
   GROUP BY
       child_id, parent_id
   ```
   - **Purpose**: Eliminate duplicate `(child_id, parent_id)` pairs while keeping the relationship with the highest `level`.
   - **Details**:
     - Duplication arises when a child has multiple paths to the same parent.
     - `MAX(level)` ensures that the longest path (most levels) to a parent is preserved.

---

### 4. **Construct Paths: `nodes` CTE**
   ```sql
   SELECT
       da.child_id as id,
       array_agg(
           parent_id
           ORDER BY
               max_level DESC
       ) || da.child_id as path
   FROM
       distinct_ancestors da
   GROUP BY
       da.child_id
   ```
   - **Purpose**: Construct an ordered path for each child by aggregating its ancestors.
   - **Details**:
     - `array_agg(parent_id ORDER BY max_level DESC)` creates an array of parent IDs, ordered from the most distant ancestor to the closest.
     - The child ID (`da.child_id`) is appended to complete the path.
   - **Output**: Each child concept is associated with a full hierarchy path.

---

### 5. **Final Output**
   ```sql
   SELECT
       id,
       array_to_string(path, '.') :: ltree as path,
       to_tsvector('english', coalesce(c.concept_name, '')) as text_searchable_index_col
   FROM
       nodes
       JOIN concept c ON c.concept_id = nodes.id;
   ```
   - **Purpose**: Convert the hierarchical paths into a searchable format and enrich the output with concept details.
   - **Details**:
     - `array_to_string(path, '.')` converts the array of IDs into a dot-separated string (e.g., `1.2.3`), suitable for `ltree` (PostgreSQL's hierarchical data type).
     - `to_tsvector` creates a full-text searchable column using the `concept_name`.

---

### Summary:
1. Identify direct relationships (`Base Case`).
2. Traverse the hierarchy recursively (`Recursive Case`).
3. Deduplicate relationships to ensure unique child-parent pairs (`distinct_ancestors`).
4. Construct hierarchical paths for each child (`nodes`).
5. Format the results for hierarchical and text search (`Final Output`).