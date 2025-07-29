def demographics(df):
    df['race'] = df['race'].replace({'Black or African American': 'Black'})
    df['ethnicity'] = df['ethnicity'].replace({
        'Not Hispanic or Latino': 'Not Hispanic',
        'Hispanic or Latino': 'Hispanic'
    })

    # CREATE A NEW COLUMN "race_ethnicity" THAT IDENTIFIES (1) NON-HISPANIC BLACK PTS, (2) NON-HISPANIC WHITE PTS, (3) HISPANIC PTS,
    #  AND (4) OTHER PTS
    df.loc[df['race'] == 'Black', 'race_ethnicity'] = 'Black'
    df.loc[df['race'] != 'Black', 'race_ethnicity'] = 'Other'
    df.loc[df['race'] == 'White', 'race_ethnicity'] = 'White'
    df.loc[df['ethnicity'] == 'Hispanic', 'race_ethnicity'] = 'Hispanic'

    return df


def encounters(df):
    # CREATE A NEW COLUMN "type" THAT IDENTIFIES (1) INPATIENT, (2) OUTPATIENT, (3) EMERGENCY ENCOUNTERS AND (4) OTHER ENCOUNTERS
    df.loc[df['enc_type'] == 'Emergency', 'type'] = 'Emergency'
    df.loc[df['enc_type'] != 'Emergency', 'type'] = 'Other'
    df.loc[
        df['enc_type'].isin(['OUTPATIENTMESSAGE', 'Outpatient Pre-reg', 'Outpatient in a Bed']), 'type'] = 'Outpatient'
    df.loc[df['enc_type'] == 'Inpatient', 'type'] = 'Inpatient'

    return df


def dx(df):
    # group by SID, encounterid_de, dx_id and keep the first row - remove duplicates
    return df.groupby(['SID', 'encounterid_de', 'dx_id']).first().reset_index()


def procedures(df):
    # group by SID, encounterid_de, procedure_code and keep the first row - remove duplicates
    return df.groupby(['SID', 'encounterid_de', 'procedure_code']).first().reset_index()
