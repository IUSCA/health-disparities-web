from jinja2 import Template

from api.db import get_connection


def get_all(conn=None):
    _conn = conn or get_connection()

    with _conn.cursor() as cursor:
        cursor.execute('SELECT * FROM subject')
        for row in cursor:
            yield row

    # if we created the connection, we should close it
    if not conn:
        _conn.close()


# Function to generate demographic subquery
def create_demographic_query(demographic):
    template = Template('''
        id IN (
            SELECT DISTINCT d.sid
            FROM demographic d
            WHERE 1=1
            {% if demographic.get("age") %}
                {% if demographic.age.get("min") is not none %}
                    AND d.age >= {{ demographic.age.min }}
                {% endif %}
                {% if demographic.age.get("max") is not none %}
                    AND d.age <= {{ demographic.age.max }}
                {% endif %}
            {% endif %}
            {% if demographic.get("gender") %}
                AND d.gender = '{{ demographic.gender }}'
            {% endif %}
        )
    ''')
    return template.render(demographic=demographic).strip()


# Function to generate dx subquery
def create_dx_query(dx):
    template = Template('''
        id IN (
            SELECT DISTINCT dx.sid
            FROM dx
            JOIN concept c ON c.id = dx.concept_id
            WHERE c.code IN ({% for code in dx.code %}'{{ code }}'{% if not loop.last %}, {% endif %}{% endfor %})
            AND c.TYPE = 'dx'
        )
    ''')
    return template.render(dx=dx).strip()


# Function to generate procedure subquery
def create_procedure_query(procedure):
    template = Template('''
        id IN (
            SELECT DISTINCT p.sid
            FROM procedure p
            JOIN concept c ON c.id = p.concept_id
            WHERE c.code IN ({% for code in procedure.code %}'{{ code }}'{% if not loop.last %}, {% endif %}{% endfor %})
            AND c.TYPE = 'procedure'
        )
    ''')
    return template.render(procedure=procedure).strip()


def search(query: dict) -> list[int]:
    """
    query the subject table for subjects that match the query

    query structure:
    {
        "table": {
            column: value
        }
        ...
    }
    all the conditions are ANDed together

    possible values:
    - demographic.gender, operator: =, value: str
    - demographic.age, value: {min: int, max: int}
    - dx.code: operator: IN, value: list[str]
    - procedure.code: operator: IN, value: list[str]

    {
        "demographic": {
            "age": {
                "min": 20,
                "max": 30
            },
            "gender": "M"
        },
        "dx": {
            "code": ["123", "456"]
        },
        "procedure": {
            "code": ["789"]
        }
    }

    generates the following SQL query:
    SELECT id
    FROM subject
    WHERE
        id IN (
            SELECT DISTINCT sid
            FROM demographic d
            WHERE 1=1
            AND d.age >= 20
            AND d.age <= 30
            AND d.gender = 'M'
        )
        AND id IN (
            SELECT DISTINCT dx.sid
            FROM dx
            JOIN concept c ON c.id = dx.concept_id
            WHERE c.code IN ('121589010', '197763012', 'E11', '250', '250.0', 'R73.03')
            AND c.TYPE = 'dx'
        )
        AND EXISTS (
            SELECT DISTINCT p.sid
            FROM procedure p
            JOIN concept c ON c.id = p.concept_id
            WHERE c.code IN ('121589010', '197763012', 'E11', '250', '250.0', 'R73.03')
            AND c.TYPE = 'procedure'
        )

    :param query:
    :return:
    """

    main_template = Template('''
    SELECT id
    FROM subject
    WHERE
        {{ sub_queries | join(' AND ') }}
    ;
    ''')

    print(query)

    # Construct subqueries based on the query
    sub_query_templates = []
    if "demographic" in query:
        sub_query_templates.append(create_demographic_query(query["demographic"]))
    if "dx" in query:
        sub_query_templates.append(create_dx_query(query["dx"]))
    if "procedure" in query:
        sub_query_templates.append(create_procedure_query(query["procedure"]))

    # Render the main template with subqueries joined by AND
    sql_query = main_template.render(sub_queries=sub_query_templates)
    print(sql_query)

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql_query)
        return [row['id'] for row in cursor.fetchall()]
    finally:
        conn.close()
