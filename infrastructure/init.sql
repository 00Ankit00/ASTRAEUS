-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Scenes table: satellite imagery metadata
CREATE TABLE IF NOT EXISTS scenes (
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

-- Change detections table: STNet outputs
CREATE TABLE IF NOT EXISTS change_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scene_t1_id UUID REFERENCES scenes(id),
    scene_t2_id UUID REFERENCES scenes(id),
    location VARCHAR(100),
    geometry GEOMETRY(POLYGON, 4326),
    area_sq_meters FLOAT,
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    change_type VARCHAR(50), -- 'construction', 'agriculture', 'water', 'forest'
    status VARCHAR(20) DEFAULT 'pending', -- pending, verified, false_positive
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- User queries table: audit trail
CREATE TABLE IF NOT EXISTS queries (
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

-- Search results table: Git-RSCLIP outputs
CREATE TABLE IF NOT EXISTS search_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID REFERENCES queries(id),
    scene_id UUID REFERENCES scenes(id),
    score FLOAT,
    relevance_rank INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Administrative boundaries table
CREATE TABLE IF NOT EXISTS boundaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    level VARCHAR(20) NOT NULL, -- 'country', 'state', 'district', 'city'
    parent_id UUID REFERENCES boundaries(id),
    geometry GEOMETRY(POLYGON, 4326) NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scenes_location ON scenes(location);
CREATE INDEX IF NOT EXISTS idx_scenes_date ON scenes(acquisition_date);
CREATE INDEX IF NOT EXISTS idx_scenes_geometry ON scenes USING GIST(geometry);

CREATE INDEX IF NOT EXISTS idx_changes_t1 ON change_detections(scene_t1_id);
CREATE INDEX IF NOT EXISTS idx_changes_t2 ON change_detections(scene_t2_id);
CREATE INDEX IF NOT EXISTS idx_changes_location ON change_detections(location);
CREATE INDEX IF NOT EXISTS idx_changes_geometry ON change_detections USING GIST(geometry);

CREATE INDEX IF NOT EXISTS idx_boundaries_level ON boundaries(level);
CREATE INDEX IF NOT EXISTS idx_boundaries_geometry ON boundaries USING GIST(geometry);

-- Seed India country boundary (simplified)
INSERT INTO boundaries (name, level, geometry, metadata) 
VALUES (
    'India',
    'country',
    ST_SetSRID(ST_MakeEnvelope(68.1766451354, 7.96553477623, 97.4025614766, 35.4940095078), 4326),
    '{"code": "IN", "capital": "New Delhi"}'
) ON CONFLICT DO NOTHING;

-- Seed Indian states (simplified bounding boxes for MVP)
INSERT INTO boundaries (name, level, parent_id, geometry, metadata) VALUES
('Maharashtra', 'state', (SELECT id FROM boundaries WHERE name = 'India'), ST_SetSRID(ST_MakeEnvelope(72.6, 15.6, 80.9, 22.0), 4326), '{"capital": "Mumbai", "code": "MH"}'),
('Delhi', 'state', (SELECT id FROM boundaries WHERE name = 'India'), ST_SetSRID(ST_MakeEnvelope(76.8, 28.4, 77.3, 28.9), 4326), '{"capital": "New Delhi", "code": "DL"}'),
('Karnataka', 'state', (SELECT id FROM boundaries WHERE name = 'India'), ST_SetSRID(ST_MakeEnvelope(74.0, 11.6, 78.6, 18.4), 4326), '{"capital": "Bangalore", "code": "KA"}'),
('Tamil Nadu', 'state', (SELECT id FROM boundaries WHERE name = 'India'), ST_SetSRID(ST_MakeEnvelope(76.5, 8.0, 80.4, 13.5), 4326), '{"capital": "Chennai", "code": "TN"}'),
('Telangana', 'state', (SELECT id FROM boundaries WHERE name = 'India'), ST_SetSRID(ST_MakeEnvelope(77.0, 15.9, 81.6, 19.9), 4326), '{"capital": "Hyderabad", "code": "TG"}'),
('West Bengal', 'state', (SELECT id FROM boundaries WHERE name = 'India'), ST_SetSRID(ST_MakeEnvelope(85.8, 21.5, 89.9, 27.2), 4326), '{"capital": "Kolkata", "code": "WB"}'),
('Gujarat', 'state', (SELECT id FROM boundaries WHERE name = 'India'), ST_SetSRID(ST_MakeEnvelope(68.1, 20.0, 74.3, 24.7), 4326), '{"capital": "Gandhinagar", "code": "GJ"}'),
('Rajasthan', 'state', (SELECT id FROM boundaries WHERE name = 'India'), ST_SetSRID(ST_MakeEnvelope(69.4, 23.0, 78.6, 30.2), 4326), '{"capital": "Jaipur", "code": "RJ"}'),
('Uttar Pradesh', 'state', (SELECT id FROM boundaries WHERE name = 'India'), ST_SetSRID(ST_MakeEnvelope(77.0, 23.9, 84.7, 30.4), 4326), '{"capital": "Lucknow", "code": "UP"}'),
('Kerala', 'state', (SELECT id FROM boundaries WHERE name = 'India'), ST_SetSRID(ST_MakeEnvelope(74.9, 8.2, 77.4, 12.8), 4326), '{"capital": "Thiruvananthapuram", "code": "KL"}')
ON CONFLICT DO NOTHING;

-- Seed major cities
INSERT INTO boundaries (name, level, parent_id, geometry, metadata) VALUES
('Mumbai', 'city', (SELECT id FROM boundaries WHERE name = 'Maharashtra'), ST_SetSRID(ST_MakeEnvelope(72.8, 18.9, 72.9, 19.3), 4326), '{"type": "metropolis", "population": 20000000}'),
('New Delhi', 'city', (SELECT id FROM boundaries WHERE name = 'Delhi'), ST_SetSRID(ST_MakeEnvelope(77.1, 28.5, 77.3, 28.7), 4326), '{"type": "capital", "population": 30000000}'),
('Bangalore', 'city', (SELECT id FROM boundaries WHERE name = 'Karnataka'), ST_SetSRID(ST_MakeEnvelope(77.5, 12.8, 77.7, 13.1), 4326), '{"type": "metropolis", "population": 12000000}'),
('Hyderabad', 'city', (SELECT id FROM boundaries WHERE name = 'Telangana'), ST_SetSRID(ST_MakeEnvelope(78.3, 17.3, 78.6, 17.5), 4326), '{"type": "metropolis", "population": 10000000}'),
('Chennai', 'city', (SELECT id FROM boundaries WHERE name = 'Tamil Nadu'), ST_SetSRID(ST_MakeEnvelope(80.1, 12.9, 80.3, 13.2), 4326), '{"type": "metropolis", "population": 11000000}'),
('Kolkata', 'city', (SELECT id FROM boundaries WHERE name = 'West Bengal'), ST_SetSRID(ST_MakeEnvelope(88.2, 22.4, 88.5, 22.7), 4326), '{"type": "metropolis", "population": 15000000}'),
('Pune', 'city', (SELECT id FROM boundaries WHERE name = 'Maharashtra'), ST_SetSRID(ST_MakeEnvelope(73.7, 18.4, 73.9, 18.6), 4326), '{"type": "city", "population": 7000000}')
ON CONFLICT DO NOTHING;
