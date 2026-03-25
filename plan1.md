# Project Astraeus: Visualization-First Satellite Intelligence Platform

A refined plan to build a SaaS satellite intelligence platform for government agencies, prioritizing high-performance web-based visualization, starting with India-focused deployment, designed for rapid implementation by a 2-person team.

## Key Refinements from Original Plan

### 1. Visualization-First Architecture

**Frontend: Visualization Heavy Stack**
```
Core Framework: React 18 + TypeScript 5
Map Engine: MapLibre GL 4.0 (primary) + Deck.gl 9.0 (data layers)
3D Capability: CesiumJS (terrain visualization, optional)
State Management: Zustand (lightweight, fast)
Styling: TailwindCSS + Headless UI
Charts: Recharts + D3.js (custom visualization)
WebGL: Custom shaders for satellite overlays
```

**Critical Visualization Features:**
- **Split-View Comparison**: Side-by-side T1/T2 with synchronized zoom/pan
- **Time-Travel Slider**: Intuitive before/after scrubbing with smooth transitions
- **Heatmap Overlays**: Change detection results as interactive color-coded layers
- **Natural Language Visualization**: Query results rendered as highlighted regions on map
- **Multi-Scale Navigation**: India → State → District → Village zoom levels
- **Layer Management**: Toggle between satellite, change detection, administrative boundaries, population density

**Performance Optimizations for Standard Browsers:**
- Tile-based lazy loading (256x256 or 512x512 tiles)
- Web Workers for heavy computation
- Canvas-based rendering for >10k features
- Virtual scrolling for large result lists
- Progressive enhancement (low-res → high-res tiles)
- Local caching (IndexedDB for offline viewing of cached regions)

### 2. Simplified Backend (MVP-Focused)

**Given 2-person team + ASAP timeline, reduce scope:**

**Revised Architecture:**
```
Backend: FastAPI (Python) - single monolithic API
Database: PostgreSQL + PostGIS (no separate FAISS for MVP)
Storage: MinIO (self-hosted S3)
ML Models: 
  - Git-RSCLIP (visual search only, skip for MVP if complex)
  - STNet (change detection - priority #1)
```

**Prioritized Features:**
1. **MVP Core (Week 1-2):**
   - Change detection visualization
   - India administrative boundaries overlay
   - Basic natural language query: "Show changes in Mumbai 2024-2025"
   - Two-date comparison slider

2. **MVP+ (Week 3-4):**
   - Visual search integration
   - Cross-validation pipeline
   - More intuitive query interface
   - PDF/GeoJSON export

3. **Post-MVP:**
   - Advanced analytics dashboard
   - Multi-user collaboration
   - Alerting/notifications
   - Mobile optimization

### 3. Government-Specific Features

**India-Focused Data Integration:**
- Administrative boundaries: India → States (28) → Districts (766) → Villages (600k+)
- Key cities: Delhi NCR, Mumbai, Bangalore, Hyderabad, Chennai, Kolkata, Pune
- Priority use cases:
  - **Urban planning**: Unauthorized construction detection
  - **Agriculture**: Crop health monitoring, irrigation tracking
  - **Disaster management**: Flood/drought assessment
  - **Environmental**: Deforestation, water body changes
  - **Infrastructure**: Road/railway construction progress

**Data Sources (India + Global):**
```
Satellite Data:
- Sentinel-2 (primary, 10m resolution, free)
- Landsat-8/9 (secondary, 30m, longer historical)
- ISRO data (if available via API)

Auxiliary Data:
- OpenStreetMap (roads, buildings)
- Indian administrative boundaries (shapefiles)
- Population density (WorldPop or similar)
- Weather data (optional)
```

**Government UX Requirements:**
- **Accessibility**: Keyboard navigation, screen reader support
- **Security**: Role-based access (viewer vs analyst vs admin)
- **Compliance**: Data sovereignty (India data stays in India)
- **Export**: Standard formats (GeoJSON, Shapefile, PDF reports)
- **Audit Trail**: Query history, exported reports logged

### 4. Simplified Technical Stack

**Frontend (/frontend)**
```javascript
// package.json - focused dependencies
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "maplibre-gl": "^4.0.0",
    "deck.gl": "^9.0.0",
    "zustand": "^4.5.0",
    "tailwindcss": "^3.4.0",
    "@headlessui/react": "^1.7.0",
    "recharts": "^2.12.0",
    "react-query": "^5.0.0",
    "axios": "^1.6.0",
    "date-fns": "^3.0.0",
    "lucide-react": "^0.300.0"
  }
}
```

**Backend (/backend)**
```python
# requirements.txt - minimal but sufficient
fastapi==0.110.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.0
psycopg2-binary==2.9.9
geoalchemy2==0.14.0
pydantic==2.6.0
python-multipart==0.0.9
pystac-client==0.8.0
rasterio==1.3.9
xarray==2024.1.0
ti-tiler==0.15.0
minio==7.2.0
celery==5.3.0
redis==5.0.0
torch==2.2.0
transformers==4.37.0
pillow==10.2.0
numpy==1.26.0
scipy==1.12.0
```

**Infrastructure (Docker Compose)**
```yaml
# docker-compose.yml - 5 services only
services:
  frontend: React dev server / production build
  backend: FastAPI application
  postgres: PostgreSQL 16 + PostGIS
  minio: Object storage
  redis: Caching + Celery broker
```

### 5. Database Schema (Simplified)

**Core Tables:**
```sql
-- Scenes (satellite imagery metadata)
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_id VARCHAR(100) UNIQUE NOT NULL,
    collection VARCHAR(50), -- 'sentinel-2', 'landsat'
    location VARCHAR(100), -- e.g., 'Mumbai', 'Delhi'
    geometry GEOMETRY(POLYGON, 4326) NOT NULL,
    cog_url TEXT NOT NULL,
    thumbnail_url TEXT,
    acquisition_date DATE NOT NULL,
    cloud_cover FLOAT DEFAULT 0,
    resolution FLOAT, -- meters per pixel
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Change detections (STNet outputs)
CREATE TABLE change_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_t1_id UUID REFERENCES scenes(id),
    scene_t2_id UUID REFERENCES scenes(id),
    location VARCHAR(100),
    geometry GEOMETRY(POLYGON, 4326) NOT NULL,
    area_sq_meters FLOAT,
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    change_type VARCHAR(50), -- 'construction', 'agriculture', 'water', 'forest'
    status VARCHAR(20) DEFAULT 'pending', -- pending, verified, false_positive
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- User queries (audit trail)
CREATE TABLE queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- for multi-user later
    query_text TEXT NOT NULL,
    location VARCHAR(100),
    date_from DATE,
    date_to DATE,
    results_count INTEGER,
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Search results (Git-RSCLIP outputs)
CREATE TABLE search_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID REFERENCES queries(id),
    scene_id UUID REFERENCES scenes(id),
    score FLOAT,
    relevance_rank INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_scenes_location ON scenes(location);
CREATE INDEX idx_scenes_date ON scenes(acquisition_date);
CREATE INDEX idx_scenes_geometry ON scenes USING GIST(geometry);
CREATE INDEX idx_changes_t1 ON change_detections(scene_t1_id);
CREATE INDEX idx_changes_t2 ON change_detections(scene_t2_id);
CREATE INDEX idx_changes_location ON change_detections(location);
CREATE INDEX idx_changes_geometry ON change_detections USING GIST(geometry);
```

### 6. API Endpoints (Core)

```python
# FastAPI routes - minimal viable set

# Health check
GET /api/health

# Scenes
GET /api/scenes?location={}&date_from={}&date_to={}&cloud_cover={}
GET /api/scenes/{id}

# Change Detection
POST /api/change-detect
  body: { "location": "Mumbai", "date_from": "2024-01-01", "date_to": "2025-01-01", "notify_email": "user@gov.in" }
GET /api/change-detect/{job_id}/status
GET /api/change-detect/{job_id}/results

# Visual Search (if time permits)
POST /api/search
  body: { "query": "construction sites", "location": "Delhi", "limit": 50 }

# Combined Query (the "magic" endpoint)
POST /api/analyze
  body: { "query": "Show unauthorized construction in Bangalore 2024", "confidence_threshold": 0.7 }
  
# Tiles (for map display)
GET /api/tiles/{scene_id}/{z}/{x}/{y}.png
GET /api/tiles/change/{detection_id}/{z}/{x}/{y}.png

# Export
GET /api/export/changes/{job_id}?format=geojson
GET /api/export/changes/{job_id}?format=pdf

# Administrative boundaries (static data)
GET /api/boundaries?level={country|state|district}&parent={}&format=geojson
```

### 7. Frontend Component Structure

```
/src
  /components
    /map
      - MapContainer.tsx          # Main map with MapLibre
      - LayerManager.tsx          # Toggle layers on/off
      - SplitView.tsx             # Side-by-side comparison
      - TimeSlider.tsx            # Before/after scrubber
      - ChangeOverlay.tsx         # Color-coded change layers
      - BoundaryOverlay.tsx       # Admin boundaries
    /query
      - NaturalLanguageInput.tsx  # "Ask anything" search bar
      - QueryBuilder.tsx          # Advanced filter UI
      - DateRangePicker.tsx       # Temporal selection
      - LocationSelector.tsx      # India → State → District
    /results
      - ResultsList.tsx           # Scrollable change list
      - ChangeCard.tsx            # Individual result preview
      - StatisticsPanel.tsx       # Charts & numbers
      - ExportOptions.tsx         # Download buttons
    /ui
      - Header.tsx
      - Sidebar.tsx
      - LoadingOverlay.tsx
      - ToastNotifications.tsx
  /store
    - useMapStore.ts              # Map state (zoom, center, layers)
    - useQueryStore.ts            # Query state
    - useResultsStore.ts          # Results & loading states
  /hooks
    - useScenes.ts                 # Fetch satellite imagery
    - useChangeDetection.ts        # Run & poll change detection
    - useSearch.ts                 # Visual search
    - useTileLayer.ts              # Dynamic tile loading
  /types
    - index.ts                     # TypeScript interfaces
  /utils
    - geo.ts                       # GeoJSON helpers
    - format.ts                    # Formatters
  App.tsx
  main.tsx
```

### 8. MVP Implementation Roadmap (4 Weeks)

**Week 1: Foundation**
- [ ] Docker Compose setup (PostGIS, MinIO, Redis)
- [ ] Database schema + seed India boundaries
- [ ] FastAPI skeleton + health endpoints
- [ ] React frontend + MapLibre integration
- [ ] Basic map UI: zoom, pan, layer toggle

**Week 2: Data & Change Detection**
- [ ] STAC integration (Sentinel-2 data fetch)
- [ ] COG processing pipeline
- [ ] STNet integration (change detection model)
- [ ] Change detection API endpoints
- [ ] Split-view UI (T1 vs T2 comparison)
- [ ] Time slider component

**Week 3: Query & Visualization**
- [ ] Natural language query parser
- [ ] Combined search + change detection pipeline
- [ ] Results visualization (highlighted regions)
- [ ] Statistics panel (area changed, count, etc.)
- [ ] Export to GeoJSON/JSON

**Week 4: Polish & Deployment**
- [ ] UI/UX refinements
- [ ] Performance optimization
- [ ] Error handling & loading states
- [ ] Basic auth (simple JWT)
- [ ] Deploy to staging
- [ ] Documentation

### 9. Post-MVP Feature List (Priority Order)

1. Git-RSCLIP visual search integration
2. Cross-validation pipeline (search + change detection)
3. PDF report generation with maps
4. User accounts & role-based access
5. Real-time processing (currently batch)
6. Alerting/notifications for new changes
7. Historical timeline view
8. 3D terrain visualization
9. Mobile-responsive design
10. Advanced analytics (trends, predictions)

### 10. Success Metrics

**Technical:**
- Map response time < 2 seconds
- Change detection query < 30 seconds (async)
- Support for 100+ concurrent users
- 99.5% uptime

**Product:**
- Natural language query accuracy > 80%
- Change detection precision > 85%
- User can complete "analyze location" in < 3 clicks
- Export generation < 10 seconds

### 11. Risk Mitigation

**Data Availability:**
- Risk: Sentinel-2 cloud cover in monsoon season
- Mitigation: Cache clear-sky imagery, use Landsat as backup

**Model Performance:**
- Risk: STNet may be slow on CPU
- Mitigation: GPU inference server, queue long jobs

**Scale:**
- Risk: India is large (3.3M km²)
- Mitigation: Start with 5 major cities, expand gradually

**Team Capacity:**
- Risk: 2-person team, limited time
- Mitigation: Strict MVP scope, defer advanced features

## Next Steps

1. **Confirm plan scope** - Approve this refined direction
2. **Create project structure** - Set up monorepo with /frontend, /backend, /infrastructure
3. **Start Week 1 tasks** - Begin with Docker Compose and DB setup
4. **Get Sentinel-2 API access** - Register for Copernicus Data Space
5. **Acquire India boundary data** - Source shapefiles for states/districts

---

*This refined plan prioritizes visualization excellence, government usability, and rapid delivery while maintaining technical soundness for future scaling.*
