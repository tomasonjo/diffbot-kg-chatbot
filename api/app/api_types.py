from typing import Optional

from pydantic import BaseModel


class ArticleData(BaseModel):
    query: Optional[str]
    tag: Optional[str]
    size: int


class EntityData(BaseModel):
    size: int


class CountData(BaseModel):
    type: str
