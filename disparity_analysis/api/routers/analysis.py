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



