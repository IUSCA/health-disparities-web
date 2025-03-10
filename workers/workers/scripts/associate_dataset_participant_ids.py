import pandas as pd
from tqdm import tqdm

from workers.api import APIServerSession, get_all_datasets, update_dataset

df = pd.read_csv('sample_to_participant_id_mapping.csv')

for t in tqdm(list(df.itertuples())):
    # name = t.sample, t.participant_id
    try:
        datasets = get_all_datasets(name=t.sample)
        if len(datasets) == 1:
            dataset = datasets[0]
            update_data={'participant_id': t.participant_id}
            update_dataset(dataset_id=dataset['id'], update_data=update_data)
        else:
            print(t, 'len(datasets)', len(datasets))
    except Exception as e:
        print(t, e)