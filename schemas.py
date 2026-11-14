from pydantic import BaseModel, Field
from typing import List, Optional

class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=300)

class BlogSummary(BaseModel):
    slug: str
    title: str
    topic: str
    mode: str
    created_at: str

class BlogDetail(BlogSummary):
    markdown: str
    images: List[str] = []
    evidence: List[dict] = []