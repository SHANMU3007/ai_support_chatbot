from pydantic import BaseModel
from typing import Any, Dict, List, Optional


class NLQueryRequest(BaseModel):
    question: str
    user_id: str


class NLQueryResult(BaseModel):
    sql: str
    rows: List[Dict[str, Any]]
    count: int
    error: Optional[str] = None
