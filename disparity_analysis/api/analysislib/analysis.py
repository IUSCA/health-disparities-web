from collections import defaultdict

import numpy as np
import pandas as pd
import statsmodels.api as sm
from pydantic import BaseModel

from api.db import conn
from api.db.models import intervention as intrv



def get_response(cohort_id, table_name, concept_ids):
    """
    Retrieve the response status (true or false) for subjects in a cohort
    based on the presence of specific concepts in a given table.

    :param cohort_id: The ID of the cohort definition.
    :param table_name: The name of the table to query ('dx' or 'procedure').
    :param concept_ids: A list of concept IDs to check for each subject.
    :return: A list of dictionaries with subject IDs and their response status.
    """
    assert table_name in ['dx', 'procedure']
    sql = f"""
        select 
        c.sid,
        case 
            when exists (
                select 1 
                from {table_name} t
                where 
                    t.sid = c.sid
                    and t.concept_id in ( {','.join(['?'] * len(concept_ids))} )
            ) then true
            else false
        end as response
        from cohort c
        where c.cohort_definition_id = ?
    """
    cursor = conn.cursor()
    cursor.execute(sql, concept_ids + [cohort_id])
    data = cursor.fetchall()
    cursor.close()
    return [dict(row) for row in data]


def get_demographics_by_cohort(cohort_id: int) -> list[dict]:
    """
    For each subject in the cohort, get the demographic information and the number of encounters.

    Number of rows in the result set is equal to the number of subjects in the cohort.
    Each dict in the result set has the following keys:
    - sid: int
    - age:
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            select d.sid, d.age, d.gender, d.race_ethnicity, (select count(*) from encounter e where e.sid = c.sid) as num_encounters
            from cohort c 
            join demographic d on d.sid = c.sid
            where c.cohort_definition_id = ?
            """,
            (cohort_id,),
        )
        return [dict(row) for row in cursor]
    finally:
        conn.close()


def prep_logistic_df(df_response, df_demo) -> tuple[pd.DataFrame, pd.Series]:
    # merge the demographic and response data
    df_total = pd.merge(df_demo, df_response, left_on='sid', right_on='sid')
    df_total.drop(['sid'], inplace=True, axis=1)
    df_total['response'] = df_total['response'].astype(int)

    # convert gender to a binary variable
    df_total['gender'] = df_total['gender'].apply(lambda x: 0 if x == 'Male' else 1)

    # create columns for Black, Hispanic, and Other
    df_total = pd.concat([df_total, pd.get_dummies(df_total['race_ethnicity'])], axis=1)

    # drop missing data
    df_total = df_total.dropna(axis=0)

    df_total['intercept'] = 1
    X = df_total[['age', 'gender', 'num_encounters', 'Black', 'Hispanic', 'intercept']]
    y = df_total['response']

    return X, y


def reverse_dummy(x):
    if x.Black == 1:
        return 'Black'
    if x.Hispanic == 1:
        return 'Hispanic'
    else:
        return 'White'


def summarize_logistic_data(X, y):
    # Compute average age
    # Compute average number of ecnounters
    # Compute percent female
    # Compute total count of each race and number that got treatment

    X = pd.concat([X, y], axis=1)
    X['identity'] = X.apply(reverse_dummy, axis=1)

    total_identity = {'Black': X['Black'].sum(), 'Hispanic': X['Hispanic'].sum()}
    total_identity['White'] = X.shape[0] - sum(total_identity.values())

    X = X.drop(['Black', 'Hispanic'], axis=1)

    agg_control = {'age': 'mean', 'gender': 'sum', 'num_encounters': 'mean',
                   'response': 'sum'}

    X = X.groupby('identity').agg(agg_control)
    X.columns = ['mean_age', 'num_female', 'mean_num_encounters', 'num_positive']
    X['num_total'] = pd.Series(total_identity)

    return X


def get_avg_female(X):
    avg_white = {'age': X['age'].mean(), 'gender': 1,
                 'num_encounters': X['num_encounters'].mean(),
                 'Black': 0, 'Hispanic': 0, 'intercept': 1}
    avg_df = 3 * [avg_white]
    avg_df = pd.DataFrame(avg_df)
    avg_df.index = ['White', 'Black', 'Hispanic']
    avg_df.loc['Black', 'Black'] = 1
    avg_df.loc['Hispanic', 'Hispanic'] = 1
    return avg_df


def logistic_analysis(X: pd.DataFrame, y: pd.Series) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Perform logistic regression analysis on the given cohort and reponse data.

    :param X: DataFrame containing the independent variables / cohort data.
    :param y: Series containing the dependent variable (response).
    :return: A tuple containing the logistic regression results DataFrame and the summary DataFrame.

    The `res_df` DataFrame contains the logistic regression results, including the parameters and p-values for each variable.
    The `X_summary` DataFrame provides a summary of the logistic regression analysis, including mean age, percentage of females,
    mean number of encounters, number of positive responses, total number of subjects, and adjusted percentages for each race/ethnicity group.
    """
    log_reg = sm.Logit(y, X.astype(float)).fit()

    res_df = pd.concat([log_reg.params, log_reg.pvalues], axis=1)
    res_df.columns = ['params', 'p-values']
    res_df['p-values'] = res_df['p-values'].round(4)

    X_summary = summarize_logistic_data(X, y)
    avg_df = get_avg_female(X)
    adjusted_rates = log_reg.predict(avg_df)
    X_summary['adj_percents'] = adjusted_rates

    X_summary.columns = ['mean_age', '% female', 'mean_encounters', 'num_positive',
                         'num_total', 'adj_percents']
    X_summary['percent_positive'] = (X_summary['num_positive'] / X_summary['num_total'] * 100).round(1)
    X_summary['adj_percents'] = (X_summary['adj_percents'] * 100).round(1)
    X_summary = X_summary[['num_positive', 'num_total', 'percent_positive', 'adj_percents']]
    return res_df, X_summary


def logistic_analysis_main(cohort_id: int, intervention_id: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Perform logistic regression analysis on the given cohort and intervention after fetching them.
    :param cohort_id:
    :param intervention_id:
    :return: A tuple containing the logistic regression results DataFrame and the summary DataFrame.
    """
    intervention = intrv.fetch_one(intervention_id)
    if intervention is None:
        raise ValueError(f"Intervention with ID {intervention_id} not found.")
    concept_ids = [c['id'] for c in intervention['concepts']]
    df_response = pd.DataFrame(get_response(
        cohort_id=cohort_id,
        table_name=intervention['category'],
        concept_ids=concept_ids))
    if df_response.empty:
        raise ValueError(f"Cohort with ID {cohort_id} not found.")

    df_demo = pd.DataFrame(get_demographics_by_cohort(cohort_id))
    X, y = prep_logistic_df(df_response, df_demo)
    return logistic_analysis(X, y)
