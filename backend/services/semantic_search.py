import uuid
import random
from typing import Dict, Any, List

class SemanticSearchService:
    """Mock service for Git-RSCLIP semantic search across satellite imagery archives."""
    
    def search(self, location: str, query: str, bbox: str) -> Dict[str, Any]:
        """
        Simulates a semantic search query against an image archive (like Sentinel-2 data).
        Returns a 'heatmap' of bounding boxes / regions that match the semantic query.
        """
        try:
            min_lat, min_lng, max_lat, max_lng = map(float, bbox.split(','))
        except Exception:
            min_lat, min_lng, max_lat, max_lng = 18.9, 72.8, 19.1, 73.0 # Fallback 
            
        semantic_hits = []
        # Generate 3-8 hotspots of semantic relevance
        for _ in range(random.randint(3, 8)):
            lat = random.uniform(min_lat, max_lat)
            lng = random.uniform(min_lng, max_lng)
            # Create a small polygon for the hotspot
            size = random.uniform(0.001, 0.005)
            
            coords = [
                [lng, lat],
                [lng + size, lat],
                [lng + size, lat + size],
                [lng, lat + size],
                [lng, lat]
            ]
            
            score = round(random.uniform(0.65, 0.98), 2)
            
            semantic_hits.append({
                "id": str(uuid.uuid4()),
                "score": score,
                "relevance_rank": _ + 1,
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [coords]
                }
            })
            
        return {
            "query": query,
            "location": location,
            "hits": semantic_hits
        }
