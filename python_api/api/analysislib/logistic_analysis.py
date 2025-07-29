import numpy as np
import pandas as pd
import statsmodels.api as sm
from statsmodels.stats.outliers_influence import variance_inflation_factor

from .cohort_analysis import cohort_encounter_df
from .constants import FILE_LOCATION


## Perform analysis while only loading data once

# Use decorator to store last call to function?

# Does the work of load/preprocessing for analysis
# Also add num encounters? Or use separate cohort summary function?
def get_cohort_response_df(cohort_sids, csvfile, response_col,
                           response_true, filters):
    """
    This function effectively filters and processes the cohort data to create a DataFrame that indicates whether each
    subject in the cohort has a true response based on the specified criteria.

    :param cohort_sids: List of subject IDs in the cohort
    :param csvfile: Name of the file containing the cohort data
    :param response_col: Column in the file that is the response variable
    :param response_true: List of values that indicate a true response
    :param filters: Dictionary of filters to apply to the cohort data
    :return:
    """

    df = pd.read_csv(FILE_LOCATION + csvfile + '.csv', encoding='ISO-8859-1')
    df['sid'] = df['SID']
    df = df.loc[df['sid'].isin(cohort_sids)]

    if filters:
        for filter_key in filters.keys():
            df = df.loc[df[filter_key].isin(
                filters[filter_key])]

    df['response'] = df[response_col].isin(response_true)
    df = df[['sid', 'response']]
    # Any true df_response true for sid
    df = df.groupby('sid')['response'].any()
    df = df.reset_index()

    return df


# cohort_sids = cohort
# response_file = 'meds_orders_subset'
# response_col = 'medication_name'
# response_true = [meds[4]]
# response_filters = {'type_group':['inpatient']}


### TEMP LOCATION
# This function preps the data and runs the logistic regression, returns the object
def prep_logistic_df(cohort_sids, response_file, response_col,
                     response_true, response_filters):
    df_demo = pd.read_csv(FILE_LOCATION + 'RDRP4355-IU-demo.csv', encoding='ISO-8859-1')
    df_demo = df_demo.loc[df_demo['sid'].isin(cohort_sids)]
    df_response = get_cohort_response_df(cohort_sids, response_file,
                                         response_col, response_true, response_filters)

    # WHy not same length as cohort sids
    df_encounters = cohort_encounter_df(cohort_sids)

    df_demo = df_demo[['sid', 'age', 'gender', 'race']]
    df_total = pd.merge(df_demo, df_response, left_on='sid', right_on='sid')
    df_total = pd.merge(df_total, df_encounters, how='left', on='sid')
    df_total.drop(['sid', 'sid'], inplace=True, axis=1)

    # TODO: Rename 'gender' as 'is_Female'
    df_total['gender'] = df_total['gender'].apply(lambda x: 0 if x == 'Male' else 1)

    # TODO: Rename e.g. 'Black' as 'is_Black'
    df_total = pd.concat([df_total, pd.get_dummies(df_total['race'])], axis=1)
    df_total.drop(['race', 'White'], inplace=True, axis=1)
    df_total['response'] = df_total['response'].astype(int)

    # DROP ROWS WITH MISSING DATA. TODO: Check number
    df_total = df_total.dropna(axis=0)

    data_cols = list(df_total.columns)
    data_cols.remove('response')
    X = df_total[data_cols]
    X['intercept'] = 1
    X['Black'] = X['Black or African American']
    X = X[['age', 'gender', 'num_encounters', 'Black', 'Asian', 'intercept']]

    y = df_total['response']

    return X, y


def log_reg_diagnostics(X_mat, y_vec, log_reg):
    var_factors = pd.Series([variance_inflation_factor(X_mat.values, i)
                             for i in range(X_mat.shape[1])],
                            index=X_mat.columns)
    mcfadden_r = log_reg.prsquared

    # TODO: Check pseudo r-squared and variance inflation factor and warn if bad


def compute_relative_prob(log_reg):
    params = log_reg.params
    conf = log_reg.conf_int()
    conf['Odds Ratio'] = params
    conf.columns = ['2.5%', '97.5%', 'Adjusted Odds Ratio']
    return np.exp(conf)
    # TODO: Convert adjusted odds to probability ratios


def reverse_dummy(x):
    if x.Black == 1:
        return 'Black'
    if x.Asian == 1:
        return 'Asian'
    else:
        return 'White'


def summarize_logistic_data(X, y):
    # Compute average age
    # Compute average number of ecnounters
    # Compute percent female
    # Compute total count of each race and number that got treatment

    X = pd.concat([X, y], axis=1)
    X['identity'] = X.apply(reverse_dummy, axis=1)

    total_identity = {'Black': X['Black'].sum(), 'Asian': X['Asian'].sum()}
    total_identity['White'] = X.shape[0] - sum(total_identity.values())

    X = X.drop(['Black', 'Asian'], axis=1)

    agg_control = {'age': 'mean', 'gender': 'sum', 'num_encounters': 'mean',
                   'response': 'sum'}

    X = X.groupby('identity').agg(agg_control)
    X.columns = ['mean_age', 'num_female', 'mean_num_encounters', 'num_positive']
    X['num_total'] = pd.Series(total_identity)

    return X


def get_avg_female(X):
    avg_white = {'age': X['age'].mean(), 'gender': 1,
                 'num_encounters': X['num_encounters'].mean(),
                 'Black': 0, 'Asian': 0, 'intercept': 1}
    avg_df = 3 * [avg_white]
    avg_df = pd.DataFrame(avg_df)
    avg_df.index = ['White', 'Black', 'Asian']
    avg_df.loc['Black', 'Black'] = 1
    avg_df.loc['Asian', 'Asian'] = 1
    return avg_df


def logistic_analysis(cohort_sids, response_file,
                      response_col, response_true, response_filters=None):
    X, y = prep_logistic_df(cohort_sids, response_file, response_col,
                            response_true, response_filters)
    log_reg = sm.Logit(y, X.astype(float)).fit()

    # print(X.shape)

    res_df = pd.concat([log_reg.params, log_reg.pvalues], axis=1)
    res_df.columns = ['params', 'p-values']
    res_df['p-values'] = res_df['p-values'].round(4)

    X_summary = summarize_logistic_data(X, y)
    avg_df = get_avg_female(X)
    adjusted_rates = log_reg.predict(avg_df)
    # inverse logit - NOT NEEDED
    # adjusted_rates = 1/(1+np.exp(-1*adjusted_rates))
    X_summary['adj_percents'] = adjusted_rates

    # Eventually make the get_avg_female use the cohort summary function?
    # Currently computes cohort info then drops 
    X_summary.columns = ['mean_age', '% female', 'mean_encounters', 'num_positive',
                         'num_total', 'adj_percents']
    X_summary['% positive'] = (X_summary['num_positive'] / X_summary['num_total'] * 100).round(1)
    X_summary['adj_percents'] = (X_summary['adj_percents'] * 100).round(1)
    X_summary = X_summary[['num_positive', 'num_total', '% positive', 'adj_percents']]

    return res_df, X_summary
