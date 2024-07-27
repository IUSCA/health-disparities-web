### User Stories for Data Explorer and Visualization Component of the Cohort Builder

**1. Selecting and Displaying Cohorts**

**User Story 1: Select a Cohort**
- **As a** user
- **I want** to select a cohort from a dropdown list of added cohorts and the combined cohort
- **So that** I can explore and visualize the data for the selected cohort.

**Acceptance Criteria:**
- A dropdown menu should display all cohorts added in the builder and the combined cohort.
- Selecting a cohort from the dropdown should load the corresponding data and visualizations.

**2. Switching Between Data and Visualization Tabs**

**User Story 2: Switch Tabs**
- **As a** user
- **I want** to switch between data and visualization tabs
- **So that** I can view the cohort data in both tabular and graphical formats.

**Acceptance Criteria:**
- Two tabs should be available: Data and Visualization.
- Clicking on the Data tab should display detailed participant data.
- Clicking on the Visualization tab should display charts and histograms.

**3. Visualizing Participant Data**

**User Story 3: View Gender, Race, and Ethnicity Distribution**
- **As a** user
- **I want** to see pie charts for gender, race, and ethnicity distribution among participants
- **So that** I can understand the demographic breakdown of the selected cohort.

**Acceptance Criteria:**
- Pie charts should display the distribution of gender, race, and ethnicity for the selected cohort.

**User Story 4: View Age, Max Encounter Date, and Enrollment Date Histograms**
- **As a** user
- **I want** to see histograms for age, max encounter date, and enrollment date of participants
- **So that** I can understand the distribution of these attributes within the selected cohort.

**Acceptance Criteria:**
- Histograms should display the distribution of age, max encounter date, and enrollment date for the selected cohort.

**4. Viewing Detailed Participant Data**

**User Story 5: View Participant Details**
- **As a** user
- **I want** to see detailed data for each participant including demographics, labs, diagnoses, medications, hospitalizations, COVID tests, and COVID vaccines
- **So that** I can have a comprehensive view of each participant's information.

**Acceptance Criteria:**
- A data table should display detailed information for each participant in the selected cohort.

**5. Behavior When Modifying Cohorts**

**User Story 6: Auto-Select Initial Cohort**
- **As a** user
- **I want** the first cohort I create with at least one rule to be automatically selected
- **So that** I can immediately view its data and visualizations.

**Acceptance Criteria:**
- The initial cohort with at least one rule should be auto-selected upon creation.

### Updated and Additional User Stories for Data Explorer and Visualization Component of the Cohort Builder Feature

**1. Handling Addition and Removal of Cohorts**

**User Story 7: Auto-Select Single Non-Empty Cohort**
- **As a** user
- **I want** the only non-empty cohort to be automatically selected when the number of non-empty cohorts goes from zero to one
- **So that** I can immediately view its data and visualizations.

**Acceptance Criteria:**
- When the number of non-empty cohorts goes from zero to one, the non-empty cohort should be auto-selected.

**User Story 8: Auto-Create and Select Combination Cohort When Entering Combine Mode**
- **As a** user
- **I want** the combination cohort to be automatically created and selected when the number of non-empty cohorts goes from one to two
- **So that** I can view the combined data and visualizations.

**Acceptance Criteria:**
- When the number of non-empty cohorts goes from one to two, a combination cohort should be automatically created and selected.

**User Story 9: Auto-Remove Combination Cohort When Exiting Combine Mode**
- **As a** user
- **I want** the combination cohort to be automatically removed and the remaining non-empty cohort to be selected when the number of non-empty cohorts goes from two to one
- **So that** the remaining cohort is auto-selected and its data/visualizations are updated.

**Acceptance Criteria:**
- When the number of non-empty cohorts goes from two to one, the combination cohort should be removed.
- The remaining non-empty cohort should be auto-selected and its data/visualizations updated if the combined cohort was previously selected.

**User Story 10: Auto-Select Cohort When Selected Cohort is Removed**
- **As a** user
- **I want** the appropriate cohort to be automatically selected when the selected cohort is removed
- **So that** I can continue viewing relevant data and visualizations.

**Acceptance Criteria:**
- If a selected cohort is removed and in combine mode, select the combined cohort.
- If a selected cohort is removed and not in combine mode, select the remaining non-empty cohort.

**User Story 11: Refresh Data/Visualization on Cohort Modification**
- **As a** user
- **I want** the data and visualizations to refresh automatically when I modify the rules of a selected cohort
- **So that** I can see the updated participant distribution.

**Acceptance Criteria:**
- When a cohort's rules are modified, and the participant search is completed, the data and visualizations should refresh to reflect the updates.


**6. Handling Multiple Categories in Pie Chart**

**User Story 12: Consolidate Small Categories in Pie Chart**
- **As a** user
- **I want** the pie chart to sum up the smallest categories into an "Others" category when there are more than 5 categories
- **So that** the chart remains clear and easy to interpret.

**Acceptance Criteria:**
- If there are more than 5 categories, the smallest categories should be summed up into an "Others" category in the pie chart.

**7. Handling Empty Cohorts**

**User Story 13: Show Message for Empty Cohorts in Data and Visualization Tab**
- **As a** user
- **I want** to see an appropriate message when there are no participants in the selected cohort
- **So that** I understand there is no data to display instead of seeing an empty table.

**Acceptance Criteria:**
- If the selected cohort has no participants, the data tab should display the message: "No participants found for the selected cohort."

**8. Handling Data Fetch Failures**

**User Story 14: Show Message and Retry Option for Data Fetch Failures**
- **As a** user
- **I want** to see an appropriate message and a retry button if fetching data from the server fails
- **So that** I can attempt to reload the data.

**Acceptance Criteria:**
- If data fetch fails, the data tab should display the message: "Failed to fetch data. Please try again." along with a retry button.
- If visualization data fetch fails, the visualization tab should display the message: "Failed to fetch visualization data. Please try again." along with a retry button.


**9. Handling No Selected Cohort**

**User Story 15: Show Illustration and Message When No Cohort is Selected**
- **As a** user
- **I want** to see an illustration image and a message when no cohort is selected
- **So that** I know to select a cohort from the dropdown to see participant data or visualizations.

**Acceptance Criteria:**
- When no cohort is selected, display an illustration image.
- Display the message: "Please select a cohort from the dropdown to see participant data." on the data tab.
- Display the message: "Please select a cohort from the dropdown to see visualizations." on the visualization tab.

