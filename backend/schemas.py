"""
Pydantic schemas for API requests and responses
"""

from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from uuid import UUID


class HealthCheck(BaseModel):
    status: str
    database: str
    version: str


class SceneBase(BaseModel):
    scene_id: str
    collection: Optional[str] = None
    location: Optional[str] = None
    acquisition_date: date
    cloud_cover: float = 0
    resolution: Optional[float] = None


class SceneResponse(SceneBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    cog_url: str
    thumbnail_url: Optional[str] = None
    metadata: Dict[str, Any] = {}
    created_at: datetime


class SceneList(BaseModel):
    items: List[SceneResponse]
    total: int
    limit: int
    offset: int


class ChangeDetectionRequest(BaseModel):
    location: str
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    confidence_threshold: float = 0.7
    notify_email: Optional[str] = None


class ChangeDetectionResponse(BaseModel):
    job_id: UUID
    status: str
    message: str


class ChangeDetectionResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    location: Optional[str] = None
    area_sq_meters: Optional[float] = None
    confidence: float
    change_type: Optional[str] = None
    status: str
    geometry: Dict[str, Any]  # GeoJSON


class QueryRequest(BaseModel):
    query: str
    confidence_threshold: float = 0.7


class QueryResponse(BaseModel):
    query_id: UUID
    parsed: Dict[str, Any]
    status: str
    job_id: Optional[UUID] = None
    results: Optional[List[ChangeDetectionResult]] = None


class BoundaryResponse(BaseModel):
    id: UUID
    name: str
    level: str
    metadata: Dict[str, Any]
