# Cohort Builder Requirements

### Query Builder Functionality:
Users should be able to build queries using fields from phenotype and genotype data and combine them with logical operators such as AND, OR, and Exclude to filter participants effectively. The query builder should support the following features:
- Users should be able to see all available fields from the dataset and select the fields they want to include in their query. Relevant fields should be grouped based on their category. Operators like equals, not equals, greater than, less than, and between should be available for numeric fields. For categorical fields, users should be able to select from a list of available options. For date fields, users should be able to select a date range.
- Users should be able to combine multiple filters using logical operators like AND, OR, and Exclude.
- Execution: Enable users to execute queries and view the results in real-time.
- Performance: Optimize query performance to handle large datasets and complex queries to enable rapid prototyping and analysis.
- Visualization Options: Provide a customizable visualization interface where users can select and visualize multiple features according to their preferences.
- Versioning: Support versioning of queries to track changes and revert to previous versions if required.
- History: Maintain a history of executed queries for future reference.

#### Phenotype Filters:

Built-in fields of csv dataset from these categories:
- demographic
- lab
- diagnosis
- medication
- hospitalization
- COVID Tests
- COVID Vaccination
    
Derived Features Support: Enable users to utilize derived features in their queries and cohort creation process.

#### Genotype Filters:
Variant Analysis: Provide functionality to analyze genotype variants including genotype counts, allele counts, and frequency.
Annotation Integration: Users should have access to genotype annotations for deeper analysis.


### Combination of Cohorts:

- Set Operations: Enable users to combine cohorts using set operations like union, intersection, difference, and symmetric difference.
- Allow users to add multiple cohorts to the builder and edit them simultaneously.
- Live Count Display: Cohorts should dynamically update without the need for saving to reflect changes in combined cohorts.
- Save and Export Functionality: Users should be able to save and export the combined cohort for further analysis or sharing.
- Visualization: Provide visualization options to view the distribution of participants across different cohorts.
- Performance: Optimize the performance of combining large cohorts to provide real-time results.


### Cohort Actions:
- Prototype Creation: Provide an option to create new cohorts for prototyping and experimentation.
- Load and Resume Prototyping: Users should be able to load and resume prototyping cohorts in edit mode.
- Search and Filter Existing Cohorts: Allow users to search existing cohorts based on various filters like creator, publication status, name, and description.
- Edit, Save, and Publish Options: Users should have the ability to edit, save, and publish cohorts based on their requirements.
- Export Participant Data: Enable users to export both phenotype and genotype data of participants of a cohorts.