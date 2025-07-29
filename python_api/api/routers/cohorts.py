from typing import Optional

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.analysislib import analysis
from api.db.models import cohort, subject, encounter
from api.routers.search import SearchQuery

router = APIRouter(
    prefix="/cohorts",
    tags=["cohorts"],
)


class Cohort(BaseModel):
    name: str
    description: Optional[str] = None
    query: SearchQuery


@router.post("/")
def create_cohort(body: Cohort):
    query = body.model_dump(exclude_none=True)['query']
    sids = subject.search(query)
    print('sids: ', len(sids))
    return cohort.create_cohort(name=body.name,
                                query=query,
                                sids=sids,
                                description=body.description)
@router.get("/")
def get_cohorts(search_query: Optional[str] = None, sort_by: Optional[str] = 'created_at', sort_order: Optional[str] = 'desc') -> list[dict]:
    return cohort.fetch_all(sort_by, sort_order, search_query)

@router.get("/{cohort_id}")
def get_cohort(cohort_id: int):
    return cohort.get_cohort(cohort_id)


@router.get('/{cohort_id}/summary')
def cohort_summary(cohort_id: int) -> list[analysis.Summary]:
    return analysis.cohort_summary(cohort_id)


@router.get('/{cohort_id}/encounter_percentiles')
def encounter_percentiles(cohort_id: int) -> analysis.EncounterPercentiles:
    res = encounter.get_counts_by_race_ethnicity(cohort_id)
    if not res:
        raise HTTPException(status_code=404, detail="Cohort not found")
    df = pd.DataFrame(res)
    df.drop(columns='sid', inplace=True, errors='ignore')
    return analysis.encounter_percentiles(df)


@router.get('/{cohort_id}/encounter_bins')
def encounter_bins(cohort_id: int) -> analysis.EncounterBins:
    res = encounter.get_counts_by_race_ethnicity(cohort_id)
    if not res:
        raise HTTPException(status_code=404, detail="Cohort not found")
    df = pd.DataFrame(res)
    df.drop(columns='sid', inplace=True, errors='ignore')
    return analysis.encounter_bins(df)
