from enum import Enum
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from api.db.models import intervention as intrv

router = APIRouter(
    prefix="/interventions",
    tags=["interventions"],
)


class CategoryEnum(str, Enum):
    dx = "dx"
    procedure = "procedure"


class InterventionRequest(BaseModel):
    name: str
    description: Optional[str] = None
    category: CategoryEnum
    concept_ids: list[int]


@router.get('/{intervention_id}')
def get_intervention(intervention_id: int):
    return intrv.fetch_one(intervention_id)


@router.get('/')
def get_interventions(search_query: Optional[str] = None, category: Optional[str] = None,
                      sort_by: Optional[str] = 'created_at', sort_order: Optional[str] = 'desc'):
    return intrv.fetch_all(search_query, category, sort_by, sort_order)


@router.post('/')
def create_intervention(body: dict) -> int:
    return intrv.create(**body)
