# Groups and Hierarchy Design



## **1. Group and Hierarchy Visualization**

**Tree View of Group Hierarchies**

* Display parent-child relationships between labs, centers, subgroups, and projects.
* Optionally show **total number of subgroups** within a parent, even if not listing them explicitly.
* Add a **search function** to find all groups that contain a particular group, including indirect (non-immediate) parents.
* Consider **toggleable views**:

  * **Tree view** for hierarchy
  * **Card view** for a less dense, summary-focused layout
* Useful for PIs/admins to visualize **permission propagation** through the group hierarchy.

**Challenges**

* Displaying deep hierarchies may overwhelm the UI.
* Consider limiting depth by default and offering progressive disclosure (expand/collapse).
* Need a balance between **clarity** and **completeness**.



## **2. Permissions and Access Management**

**Managing Access and Permissions**

* Key question: **Does a permission apply only to a group, or does it cascade to its subgroups and associated projects?**
* Add options to:

  * Assign user to all subgroups and projects within a group
  * Or manually select specific subgroups/projects from a tree view

**Projects as a Special Group Type**

* A project could be modeled as a **type of group**:

  * Contains datasets
  * Has users associated with it
  * Treated uniformly in the system (i.e., project = group with type=project)
* Benefits:

  * Moves permission logic into the group model
  * Allows uniform handling of entities (labs, centers, projects, etc.)

**Tagging Model vs. Strict Hierarchy**

* Consider allowing **tag-based associations** (e.g., lab, center, grant):

  * More flexible than rigid tree structures
  * But complicates permission management
* Example challenge:

  * A project tagged with both a core and a grant — unclear who has permission control
  * Permissions may need to be **scoped or limited** to certain dimensions (e.g., only within a lab)

**Permission Propagation Rules**

* Define whether a subgroup **inherits permissions** from affiliated groups/tags.
* Control at what level permissions can be modified (e.g., only at project level, not by center).



## **3. Group Discoverability and User Onboarding**

**Access Requests**

* Users can **request access to a group** to collaborate on its projects.
* Group discoverability levels:

  * **Public**: visible and open to request
  * **Private**: not listed or accessible
  * **Custom**: owner-configurable visibility (title, members, datasets, etc.)

**Admin Controls**

* Group owners (e.g., PIs) can control:

  * What info is discoverable (e.g., description, dataset count, members)
  * Whether their group is listed publicly

**Discoverability UI**

* Create a **"Discover Groups"** landing page:

  * Shows active groups, recent updates, dataset count, active collaborators
  * Sort/filter by various attributes (e.g., activity, affiliation)
  * Similar in feel to platforms like YouTube or Biobank cohort creation

**Priority**

* **Group structure** design is primary.
* **Discoverability features** are secondary but should be kept in mind during foundational design.



## **4. Next Steps**

**Design Exploration**

* Continue sketching layouts and exploring UI models.
* Model possible **network scenarios** for group/project/user relationships and permission flows.
* Clarify edge cases: overlapping tags, multiple affiliations, custom permission rules.





