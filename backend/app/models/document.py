from pydantic import BaseModel, HttpUrl
from typing import List


class FAQPair(BaseModel):
    question: str
    answer: str


class IngestDocumentRequest(BaseModel):
    chatbot_id: str
    document_id: str


class IngestFAQRequest(BaseModel):
    chatbot_id: str
    document_id: str
    pairs: List[FAQPair]


class IngestURLRequest(BaseModel):
    chatbot_id: str
    document_id: str
    url: str
    max_pages: int = 50  # maximum pages to crawl (1 = single page only)
