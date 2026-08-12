"""
Analytics router – exposes the NL2SQL natural-language query endpoint.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.analytics import NLQueryRequest, NLQueryResult
from app.services.nl2sql_service import NL2SQLService

router = APIRouter()
_nl2sql = NL2SQLService()


@router.post("/nl-query", response_model=NLQueryResult)
async def nl_query(payload: NLQueryRequest, db: AsyncSession = Depends(get_db)):
    """
    Accept a plain-English question and a user_id, convert it to SQL via
    Groq, execute it safely, and return the structured result.
    """
    result = await _nl2sql.query(
        question=payload.question,
        user_id=payload.user_id,
        db=db,
    )

    if result.get("error"):
        # Surface backend errors clearly to the caller
        raise HTTPException(status_code=400, detail=result["error"])

    return NLQueryResult(
        sql=result["sql"],
        columns=result["columns"],
        rows=result["rows"],
        rowCount=result["rowCount"],
    )
