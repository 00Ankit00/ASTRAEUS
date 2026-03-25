"""
SQLAlchemy models for database tables
"""

from sqlalchemy import Column, String, Date, Float, DateTime, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from geoalchemy2 import Geometry
from database import Base
import datetime
import uuid


class Scene(Base):
    __tablename__ = "scenes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scene_id = Column(String(100), unique=True, nullable=False)
    collection = Column(String(50))
    location = Column(String(100))
    geometry = Column(Geometry("POLYGON", srid=4326), nullable=False)
    cog_url = Column(Text, nullable=False)
    thumbnail_url = Column(Text)
    acquisition_date = Column(Date, nullable=False)
    cloud_cover = Column(Float, default=0)
    resolution = Column(Float)
    meta_data = Column('metadata', JSONB, default={})
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ChangeDetection(Base):
    __tablename__ = "change_detections"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scene_t1_id = Column(UUID(as_uuid=True), ForeignKey("scenes.id"))
    scene_t2_id = Column(UUID(as_uuid=True), ForeignKey("scenes.id"))
    location = Column(String(100))
    geometry = Column(Geometry("POLYGON", srid=4326), nullable=True)
    area_sq_meters = Column(Float)
    confidence = Column(Float)
    change_type = Column(String(50))
    status = Column(String(20), default="pending")
    meta_data = Column('metadata', JSONB, default={})
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Query(Base):
    __tablename__ = "queries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True))
    query_text = Column(Text, nullable=False)
    location = Column(String(100))
    date_from = Column(Date)
    date_to = Column(Date)
    results_count = Column(Integer)
    execution_time_ms = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class SearchResult(Base):
    __tablename__ = "search_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query_id = Column(UUID(as_uuid=True), ForeignKey("queries.id"))
    scene_id = Column(UUID(as_uuid=True), ForeignKey("scenes.id"))
    score = Column(Float)
    relevance_rank = Column(Integer)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Boundary(Base):
    __tablename__ = "boundaries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    level = Column(String(20), nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("boundaries.id"))
    geometry = Column(Geometry("POLYGON", srid=4326), nullable=False)
    meta_data = Column('metadata', JSONB, default={})
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
