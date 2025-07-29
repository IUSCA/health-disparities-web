from typing import Optional, List

from fastapi import APIRouter, Body, HTTPException
from fastapi.params import Query
from pydantic import BaseModel, Field

from api.db.models import subject, dx, procedure

router = APIRouter(
    prefix="/search",
    tags=["search"],
)


class AgeRange(BaseModel):
    min: Optional[int] = Field(None, ge=0, description="Minimum age in the range. Must be a non-negative integer.")
    max: Optional[int] = Field(None, ge=0, description="Maximum age in the range. Must be a non-negative integer.")


class Demographic(BaseModel):
    age: Optional[AgeRange] = Field(None, description="Age range of the subjects.")
    gender: Optional[str] = Field(None, description="Gender of the subjects. Can be 'male', 'female', or other.")


class Dx(BaseModel):
    code: Optional[List[str]] = Field(None, description="List of diagnosis codes to search for.")


class Procedure(BaseModel):
    code: Optional[List[str]] = Field(None, description="List of procedure codes to search for.")


class SearchQuery(BaseModel):
    demographic: Optional[Demographic] = Field(None, description="Demographic details for the search.")
    dx: Optional[Dx] = Field(None, description="Diagnosis codes for the search.")
    procedure: Optional[Procedure] = Field(None, description="Procedure codes for the search.")


@router.post("/subjects", summary="Search for subjects")
def search(body: SearchQuery = Body(..., description="Search criteria for finding subjects.")) -> list[int]:
    """
    Search for subjects based on the provided criteria.

    - **demographic**: Demographic details such as age range and gender.
    - **dx**: List of diagnosis codes.
    - **procedure**: List of procedure codes.

    Returns a list of subject IDs that match the search criteria.
    """
    return subject.search(body.model_dump(exclude_none=True))


@router.get('/dx', summary="Search for diagnosis codes")
def search_dx(name: str = Query(..., description="Search keyword for diagnosis codes.")) -> list[dict]:
    """
    Search for diagnosis codes by name. Returns a list of matching codes. The search is case-insensitive and partial matches are allowed.

    - **name**: The keyword to search for in diagnosis names.

    Returns a list of strings containing matching diagnosis codes and their details.
    """
    # name length should be at least 3 characters
    if len(name) < 3:
        raise HTTPException(400, "Search keyword should be at least 3 characters long.")
    return dx.search_name(name)


@router.get('/procedures', summary="Search for procedure codes")
def search_procedure(name: str = Query(..., description="Search keyword for procedure codes.")) -> list[dict]:
    """
    Search for procedure codes by name. Returns a list of matching codes. The search is case-insensitive and partial matches are allowed.

    - **name**: The keyword to search for in procedure names.

    Returns a list of dictionaries containing matching procedure codes and their details.
    """
    if len(name) < 3:
        raise HTTPException(400, "Search keyword should be at least 3 characters long.")
    return procedure.search_name(name)
