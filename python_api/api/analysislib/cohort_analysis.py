# -*- coding: utf-8 -*-
"""
Created on Sun Jan 15 16:13:54 2023

@author: prdex
"""

import matplotlib.pyplot as plt
import pandas as pd

from .constants import FILE_LOCATION


# This file contains analyses performed only on cohort SIDs
# Load the file once to compute multiple of the functions?

# document what info each func gives
def cohort_summary(cohort_sids):
    demo_df = pd.read_csv(FILE_LOCATION + 'RDRP4355-IU-demo.csv', encoding='ISO-8859-1')
    demo_df = demo_df.loc[demo_df['sid'].isin(cohort_sids)]

    enc_counts = cohort_encounter_df(cohort_sids)
    enc_counts = enc_counts.merge(demo_df, on='sid')[['race', 'num_encounters']]

    # Make gender 0/1 variable
    demo_df['gender'] = demo_df['gender'].apply(lambda x: 1 if x == 'Female' else 0)

    demo_group = demo_df.groupby('race')
    demo_summary_df = pd.concat([
        demo_group['race'].count(),
        demo_group['age'].mean(),
        demo_group['gender'].sum(),
        enc_counts.groupby('race').mean()
    ], axis=1)
    demo_summary_df['gender'] = demo_summary_df['gender'] / demo_summary_df['race']
    demo_summary_df.columns = ['total_count', 'mean_age', 'female_percent', 'mean_encounters']

    demo_summary_df['mean_age'] = demo_summary_df['mean_age'].round(1)
    demo_summary_df['female_percent'] = demo_summary_df['female_percent'].round(3) * 100
    demo_summary_df['mean_encounters'] = demo_summary_df['mean_encounters'].round(1)

    return demo_summary_df


def cohort_encounter_df(cohort_sids, detailed=False):
    sid_col, type_col = 'SID', 'enc_type'

    df_encounters = pd.read_csv(FILE_LOCATION + 'RDRP4355-IU-encounters.csv', encoding='ISO-8859-1')

    if detailed:
        df_encounters = df_encounters[[sid_col, type_col]]
        df_encounters = df_encounters.groupby(sid_col)[type_col].value_counts().unstack(type_col)
        # only select Emergency, Inpatient, Outpatient columns and rename them to emergency, inpatient, outpatient
        df_encounters = df_encounters[['Emergency', 'Inpatient', 'Outpatient']]
        df_encounters.columns = ['emergency', 'inpatient', 'outpatient']
        df_encounters = df_encounters.fillna(0)

        return df_encounters
    else:
        df_encounters = df_encounters.groupby(sid_col).count()[type_col].reset_index()
        df_encounters.columns = ['sid', 'num_encounters']

        return df_encounters.loc[df_encounters['sid'].isin(cohort_sids)]


def encounter_percentiles(cohort_sids, percentile_vals=(0.2, 0.4, 0.8, 0.99)):
    demo_df = pd.read_csv(FILE_LOCATION + 'RDRP4355-IU-demo.csv', encoding='ISO-8859-1')
    demo_df = demo_df.loc[demo_df['sid'].isin(cohort_sids)][['sid', 'race']]

    enc_df = cohort_encounter_df(cohort_sids, detailed=True)
    enc_df = enc_df.rename_axis("sid")

    summary_df = (demo_df
                  .merge(enc_df, on='sid')
                  .drop('sid', axis=1))  # .groupby('race').quantile(q=percentile_vals)

    summary_df = summary_df[summary_df['race'].isin(['Black or African American', 'HISPANIC', 'White'])]
    summary_df = summary_df.groupby('race').quantile(q=percentile_vals)

    return summary_df


def percentile_graphs(cohort_sids):
    perc_df = encounter_percentiles(cohort_sids, percentile_vals=[x / 100 for x in range(0, 100, 1)])
    perc_df = perc_df.reset_index()
    perc_df = perc_df.set_index('race')

    for typ in ['emergency', 'inpatient', 'outpatient']:
        for group in ['Black or African American', 'HISPANIC', 'White']:
            if group in perc_df.index:
                plt.plot(perc_df.loc[group]['level_1'], perc_df.loc[group][typ], label=group)

        plt.ylabel('Num. Encounters')
        plt.xlabel('Percentile')
        plt.title(typ + ' encounters')
        plt.legend()
        plt.show()


def bar_graphs(cohort_sids):
    demo_df = pd.read_csv(FILE_LOCATION + 'RDRP4355-IU-demo.csv', encoding='ISO-8859-1')
    demo_df = demo_df.loc[demo_df['sid'].isin(cohort_sids)][['sid', 'race']]

    enc_df = cohort_encounter_df(cohort_sids, detailed=True)
    enc_df = enc_df.rename_axis("sid")

    summary_df = demo_df.merge(enc_df, on='sid').drop('sid', axis=1)

    bins = [0, 1, 2, 3, 4, 5, 60]

    import numpy as np
    test = summary_df[['race', 'inpatient']]
    test = test.set_index('race')
    black_bins = np.histogram(test.loc['Black or African American']['inpatient'], bins)
    white_bins = np.histogram(test.loc['White']['inpatient'], bins)
    # hispanic_bins = np.histogram(test.loc['HISPANIC']['inpatient'], bins)

    fig, ax = plt.subplots()
    width = (black_bins[1][1] - black_bins[1][0]) / 4

    ax.bar(black_bins[1][:-1], black_bins[0], width=width, facecolor='cornflowerblue', label='Black')
    ax.bar(white_bins[1][:-1] + width, white_bins[0], width=width, facecolor='seagreen', label='White')
    # ax.bar(hispanic_bins[1][:-1] + 2 * width, hispanic_bins[0], width=width, facecolor='goldenrod', label='Hispanic')

    ax.set_xlabel('Num. Encounters')
    ax.set_ylabel('Num. Patients')
    plt.xticks((1, 2, 3, 4, 5), ('1', '2', '3', '4', '5+'))
    plt.title('Inpatient Encounters')
    fig.legend()

    test = summary_df[['race', 'emergency']]
    test = test.set_index('race')
    black_bins = np.histogram(test.loc['Black or African American']['emergency'], bins)
    white_bins = np.histogram(test.loc['White']['emergency'], bins)
    # hispanic_bins = np.histogram(test.loc['Hispanic']['emergency'], bins)

    fig, ax = plt.subplots()
    width = (black_bins[1][1] - black_bins[1][0]) / 4

    ax.bar(black_bins[1][:-1], black_bins[0], width=width, facecolor='cornflowerblue', label='Black')
    ax.bar(white_bins[1][:-1] + width, white_bins[0], width=width, facecolor='seagreen', label='White')
    # ax.bar(hispanic_bins[1][:-1] + 2 * width, hispanic_bins[0], width=width, facecolor='goldenrod', label='Hispanic')

    ax.set_xlabel('Num. Encounters')
    ax.set_ylabel('Num. Patients')
    plt.xticks((1, 2, 3, 4, 5), ('1', '2', '3', '4', '5+'))
    plt.title('Emergency Encounters')
    fig.legend()
