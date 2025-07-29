import json

import numpy as np
import pandas as pd
from fastapi import APIRouter, Path
from starlette.responses import Response

from api.analysislib import analysis
from api.db.models import result as result_model

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"],
)


class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, pd.DataFrame):
            # Replace NaN and Inf values
            obj = obj.replace([np.inf, -np.inf], None)
            obj = obj.where(pd.notna(obj), None)
            return obj.to_dict(orient='records')
        return super().default(obj)


class CustomEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.generic):
            if np.isnan(obj):
                return 'NaN'
            if np.isinf(obj):
                return 'Infinity' if obj > 0 else '-Infinity'

        return super().default(obj)


@router.post("/logistic/{cohort_id}/{intervention_id}")
def logistic_analysis(cohort_id: int = Path(..., title="The ID of the cohort to analyze"),
                      intervention_id: int = Path(..., title="The ID of the intervention to analyze")):
    res_df, X_summary = analysis.logistic_analysis_main(cohort_id, intervention_id)

    # res_df.to_csv('res_df.csv')
    # X_summary.to_csv('X_summary.csv')

    result = {
        'results': res_df.to_dict(),
        'summary': X_summary.to_dict()
    }

    result_id = result_model.create(cohort_id, intervention_id, result, 'logistic')
    #  send the result_id to the client in a header
    return Response(media_type='application/json', content=json.dumps(result, cls=CustomJSONEncoder),
                    headers={
                        "X-RESULT-ID": str(result_id)
                    })


@router.get('/results/{result_id}')
def get_result(result_id: int):
    result = result_model.fetch_one(result_id)
    return Response(media_type='application/json', content=json.dumps(result, cls=CustomJSONEncoder))


@router.get('/results/')
def get_results(cohort_id: int = None, intervention_id: int = None, analysis_type: str = None):
    results = result_model.fetch_all(cohort_id, intervention_id, analysis_type)
    return Response(media_type='application/json', content=json.dumps(results, cls=CustomJSONEncoder))
