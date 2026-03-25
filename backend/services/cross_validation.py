from typing import List, Dict, Any

class CrossValidationService:
    """Service to cross-check Change Detection geometries against Semantic Search heatmaps."""
    
    def _get_bbox(self, coordinates: List[List[float]]) -> tuple:
        """Returns (min_lng, min_lat, max_lng, max_lat)"""
        if not coordinates:
            return 0, 0, 0, 0
        lons = [p[0] for p in coordinates]
        lats = [p[1] for p in coordinates]
        return min(lons), min(lats), max(lons), max(lats)
        
    def _intersects(self, bbox1: tuple, bbox2: tuple) -> bool:
        """Simple rectangular intersection algorithm."""
        return not (bbox1[2] < bbox2[0] or bbox1[0] > bbox2[2] or bbox1[3] < bbox2[1] or bbox1[1] > bbox2[3])

    def validate_changes(self, changes: List[Dict[str, Any]], semantic_hits: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Boost confidence of changes if they intersect heavily with semantic search hits.
        Penalize them if they do not.
        """
        validated = []
        
        hit_bboxes = []
        for hit in semantic_hits:
            geom = hit.get('geometry')
            if geom and geom['type'] == 'Polygon' and len(geom['coordinates']) > 0:
                bbox = self._get_bbox(geom['coordinates'][0])
                hit_bboxes.append({
                    "bbox": bbox,
                    "score": hit.get('score', 0.5)
                })
                    
        for change in changes:
            geom = change.get('geometry')
            if not geom or geom['type'] != 'Polygon' or len(geom['coordinates']) == 0:
                change["cross_validated"] = False
                validated.append(change)
                continue
                
            change_bbox = self._get_bbox(geom['coordinates'][0])
            
            # Check intersection
            max_intersect_score = 0
            for hit in hit_bboxes:
                if self._intersects(change_bbox, hit["bbox"]):
                    if hit["score"] > max_intersect_score:
                        max_intersect_score = hit["score"]
                        
            # Adjust confidence
            original_conf = change.get("confidence", 0.5)
            
            if max_intersect_score > 0.6:
                # Strong semantic hit overlapping the change detection, boost confidence!
                new_conf = min(0.99, original_conf + (max_intersect_score * 0.2))
                cross_validated = True
            else:
                # Retain original confidence, do not penalize until semantic search uses actual OSM tags
                new_conf = original_conf
                cross_validated = False
                
            change["confidence"] = round(new_conf, 2)
            change["cross_validated"] = cross_validated
            validated.append(change)
                
        return validated
