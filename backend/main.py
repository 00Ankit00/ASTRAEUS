"""
Astraeus Backend API
FastAPI application for satellite intelligence platform
"""

from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import Column, String, Date, Float, DateTime, ForeignKey, Text, Integer, text
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
import os
import logging
import httpx
from contextlib import asynccontextmanager

from database import get_db, engine, Base, init_db
from models import Scene, ChangeDetection, Boundary, Query as QueryModel
from schemas import (
    HealthCheck, SceneResponse, SceneList, 
    ChangeDetectionRequest, ChangeDetectionResponse,
    QueryRequest, QueryResponse, BoundaryResponse
)
from pydantic import BaseModel
from services.change_detection import ChangeDetectionService
from services.query_parser import QueryParser
from services.chat_service import handle_chat

# Basic logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    logger.info("Starting up Astraeus backend.")
    init_db()
    yield
    logger.info("Shutting down.")

app = FastAPI(
    title="Astraeus API",
    description="Satellite Intelligence Platform for Government Agencies",
    version="0.1.0",
    lifespan=lifespan
)

ALLOW_ORIGINS = os.getenv("ALLOW_ORIGINS", "*").split(",")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
change_detection_service = ChangeDetectionService()
query_parser = QueryParser()


@app.get("/api/health", response_model=HealthCheck)
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return HealthCheck(
        status="healthy",
        database=db_status,
        version="0.1.0"
    )


@app.get("/api/scenes", response_model=SceneList)
async def get_scenes(
    location: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    cloud_cover: Optional[float] = Query(None, ge=0, le=100),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Get satellite scenes with optional filtering"""
    query = db.query(Scene)
    
    if location:
        query = query.filter(Scene.location.ilike(f"%{location}%"))
    if date_from:
        query = query.filter(Scene.acquisition_date >= date_from)
    if date_to:
        query = query.filter(Scene.acquisition_date <= date_to)
    if cloud_cover is not None:
        query = query.filter(Scene.cloud_cover <= cloud_cover)
    
    total = query.count()
    scenes = query.order_by(Scene.acquisition_date.desc()).offset(offset).limit(limit).all()
    
    return SceneList(
        items=[SceneResponse.from_orm(s) for s in scenes],
        total=total,
        limit=limit,
        offset=offset
    )


@app.get("/api/scenes/{scene_id}", response_model=SceneResponse)
async def get_scene(scene_id: str, db: Session = Depends(get_db)):
    """Get a specific scene by ID"""
    scene = db.query(Scene).filter(Scene.scene_id == scene_id).first()
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    return SceneResponse.from_orm(scene)


@app.post("/api/change-detect", response_model=ChangeDetectionResponse)
async def start_change_detection(
    request: ChangeDetectionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Start a change detection job"""
    # Create job record
    job = change_detection_service.create_job(request, db)
    
    # Start processing in background
    background_tasks.add_task(
        change_detection_service.process_job,
        job.id,
        db
    )
    
    return ChangeDetectionResponse(
        job_id=job.id,
        status="pending",
        message="Change detection job started"
    )


@app.get("/api/change-detect/{job_id}/status")
async def get_change_detection_status(job_id: str, db: Session = Depends(get_db)):
    """Get status of a change detection job"""
    job = change_detection_service.get_job_status(job_id, db)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.get("/api/change-detect/{job_id}/results")
async def get_change_detection_results(
    job_id: str, 
    confidence_threshold: Optional[float] = Query(0.5, ge=0, le=1),
    db: Session = Depends(get_db)
):
    """Get results of a change detection job"""
    results = change_detection_service.get_results(job_id, confidence_threshold, db)
    return results


@app.post("/api/analyze", response_model=QueryResponse)
async def analyze_query(
    request: QueryRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Process natural language query for satellite analysis"""
    # Parse the query
    parsed = query_parser.parse(request.query)
    
    # Log the query
    query_record = QueryModel(
        query_text=request.query,
        location=parsed.get("location"),
        date_from=parsed.get("date_from"),
        date_to=parsed.get("date_to")
    )
    db.add(query_record)
    db.commit()
    db.refresh(query_record)
    
    # If change detection is needed, start job
    job = None
    if parsed.get("intent") in ["change_detection", "construction", "deforestation", "visual_search"]:
        job_request = ChangeDetectionRequest(
            location=parsed.get("location", "India"),
            date_from=parsed.get("date_from"),
            date_to=parsed.get("date_to"),
            confidence_threshold=request.confidence_threshold
        )
        job = change_detection_service.create_job(job_request, db)
        
        # Inject query and structured dates into Job Meta
        meta = dict(job.meta_data) if job.meta_data else {}
        meta["query"] = request.query
        meta["date_from"] = parsed.get("date_from").isoformat() if parsed.get("date_from") else None
        meta["date_to"] = parsed.get("date_to").isoformat() if parsed.get("date_to") else None
        job.meta_data = meta
        db.commit()
        
        background_tasks.add_task(
            change_detection_service.process_job,
            job.id,
            db
        )
    
    return QueryResponse(
        query_id=query_record.id,
        parsed=parsed,
        status="processing" if job else "completed",
        job_id=job.id if job else None
    )


class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
async def chat_interaction(request: ChatRequest):
    """Delegates to chat_service which uses Groq LLM + real OSM per-year data."""
    parsed = query_parser.parse(request.message)
    return await handle_chat(request.message, parsed)


@app.get("/api/boundaries")
async def get_boundaries(
    level: Optional[str] = Query(None, regex="^(country|state|district|city)$"),
    parent: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get administrative boundaries"""
    query = db.query(Boundary)
    
    if level:
        query = query.filter(Boundary.level == level)
    if parent:
        # Find parent boundary
        parent_boundary = db.query(Boundary).filter(Boundary.name == parent).first()
        if parent_boundary:
            query = query.filter(Boundary.parent_id == parent_boundary.id)
    
    boundaries = query.all()
    
    return {
        "count": len(boundaries),
        "boundaries": [
            {
                "id": str(b.id),
                "name": b.name,
                "level": b.level,
                "metadata": b.meta_data
            }
            for b in boundaries
        ]
    }


@app.get("/api/tiles/{scene_id}/{z}/{x}/{y}.png")
async def get_tile(scene_id: str, z: int, x: int, y: int, db: Session = Depends(get_db)):
    """Get map tile for a scene"""
    raise HTTPException(status_code=501, detail="Tile serving not yet implemented")

@app.get("/api/export/changes/{job_id}")
async def export_changes(
    job_id: str,
    format: str = Query("geojson", regex="^(geojson|json|csv)$"),
    db: Session = Depends(get_db)
):
    """Export change detection results as GeoJSON or CSV."""
    import json
    import io
    import csv
    from fastapi.responses import Response

    if job_id == "latest":
        job = db.query(ChangeDetection).filter(ChangeDetection.status == "completed").order_by(ChangeDetection.created_at.desc()).first()
        if not job:
            raise HTTPException(status_code=404, detail="No completed change detection jobs found to export.")
    else:
        job = db.query(ChangeDetection).filter(ChangeDetection.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")

    raw_data = job.meta_data or {}
    changes = raw_data.get("simulated_changes", [])

    if format in ("geojson", "json"):
        features = []
        for c in changes:
            features.append({
                "type": "Feature",
                "id": c.get("id"),
                "geometry": c.get("geometry"),
                "properties": {
                    "change_type": c.get("change_type"),
                    "area_sq_meters": c.get("area_sq_meters"),
                    "confidence": c.get("confidence")
                }
            })
        
        feature_collection = {
            "type": "FeatureCollection",
            "features": features
        }
        
        return Response(
            content=json.dumps(feature_collection),
            media_type="application/geo+json",
            headers={"Content-Disposition": f'attachment; filename="astraeus_export_{job.id}.geojson"'}
        )
        
    elif format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "change_type", "area_sq_meters", "confidence", "geometry_wkt"])
        
        for c in changes:
            geom = c.get("geometry", {})
            coords = geom.get("coordinates", [])
            wkt = ""
            if coords and geom.get("type", "").lower() == "polygon":
                try:
                    ring = ", ".join([f"{pt[0]} {pt[1]}" for pt in coords[0]])
                    wkt = f"POLYGON(({ring}))"
                except Exception:
                    pass
                    
            writer.writerow([
                c.get("id", ""),
                c.get("change_type", ""),
                c.get("area_sq_meters", ""),
                c.get("confidence", ""),
                wkt
            ])
            
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="astraeus_export_{job.id}.csv"'}
        )

    raise HTTPException(status_code=400, detail="Unsupported format.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
