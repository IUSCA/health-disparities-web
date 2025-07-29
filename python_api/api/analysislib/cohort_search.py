import pandas as pd

from .constants import FILE_LOCATION


# from logistic_analysis import logistic_analysis
# from cohort_analysis import cohort_summary, percentile_graphs, bar_graphs


def filter_sid(file_name, column_name, include_terms):
    include_terms = set(include_terms)

    df = pd.read_csv(FILE_LOCATION + file_name + '.csv', encoding='ISO-8859-1')
    df.columns = [x.lower() for x in df.columns]

    keep_mask = df[column_name].isin(include_terms)
    # keep_mask = keep_mask & (~df[column_name].isin(exclude_terms) )

    unique_sid = df[keep_mask]['sid']
    return set(unique_sid)


def query_unique_vals(file_name, column_name, substring):
    column_name = column_name.lower()
    substring = substring.lower()

    df = pd.read_csv(FILE_LOCATION + file_name + '.csv', encoding='ISO-8859-1')
    df.columns = [x.lower() for x in df.columns]
    df = df[df[column_name].apply(lambda x: substring in str(x).lower())]
    df = df[column_name].unique()
    # switch order for speed if necessary

    return list(df)


def search_cohort(cohort_substring, search_file):
    # Step 1: Search cohort
    assert search_file in ['diagnosis', 'meds', 'procedures', 'nonmeds']

    if search_file == 'diagnosis':
        search_file = 'RDRP4355-IU-DXs'
        column_name = 'dx_name'
    elif search_file == 'meds':
        search_file = 'RDRP4355-IU-meds_orders'
        column_name = 'simple_name'
    elif search_file == 'procedures':
        search_file = 'RDRP4355-IU-procedures'
        column_name = 'procedure_name'
    else:
        search_file = 'RDRP4355-IU-other_orders'
        column_name = 'ordered'

    res_q1 = query_unique_vals(search_file, column_name, cohort_substring)
    return res_q1


def get_sid_str(search_terms, search_file):
    assert search_terms != None
    assert search_terms != []
    assert search_file in ['diagnosis', 'meds', 'procedures', 'nonmeds']

    if search_file == 'diagnosis':
        search_file = 'RDRP4355-IU-DXs'
        response_col = 'dx_name'
    elif search_file == 'meds':
        search_file = 'RDRP4355-IU-meds_orders'
        response_col = 'simple_name'
    elif search_file == 'procedures':
        search_file = 'RDRP4355-IU-procedures'
        response_col = 'procedure_name'
    else:
        search_file = 'RDRP4355-IU-other_orders'
        response_col = 'ordered'

    include_terms = search_terms.split(';')
    include_terms = [term for term in include_terms if term != '']
    cohort_sids = list(filter_sid(search_file, response_col, include_terms))
    cohort_sids = [str(c) for c in cohort_sids]
    return ",".join(cohort_sids)
