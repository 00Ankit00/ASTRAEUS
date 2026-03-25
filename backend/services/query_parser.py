"""
Query Parser Service
Parses natural language queries for satellite analysis
"""

import re
from typing import Dict, Any, Optional
from datetime import date, timedelta


class QueryParser:
    """Parse natural language queries to extract intent, location, and dates"""
    
    # Indian cities and locations
    INDIA_LOCATIONS = {
        'mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'chennai', 'kolkata',
        'pune', 'ahmedabad', 'jaipur', 'surat', 'lucknow', 'kanpur', 'nagpur',
        'indore', 'thane', 'bhopal', 'visakhapatnam', 'pimpri', 'patna', 'vadodara',
        'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut', 'rajkot',
        'varanasi', 'srinagar', 'aurangabad', 'dhanbad', 'amritsar', 'navi mumbai',
        'allahabad', 'ranchi', 'gwalior', 'jodhpur', 'coimbatore', 'vijayawada',
        'jabalpur', 'madurai', 'raipur', 'kota'
    }
    
    # Change detection keywords
    CHANGE_KEYWORDS = {
        'construction', 'building', 'development', 'change', 'changed', 'new',
        'deforestation', 'forest', 'trees', 'agriculture', 'crop', 'farm',
        'urbanization', 'expansion', 'growth', 'water', 'lake', 'river'
    }
    
    # Search keywords
    SEARCH_KEYWORDS = {
        'find', 'search', 'show', 'locate', 'where is', 'look for',
        'buildings', 'roads', 'bridges', 'airports', 'ports', 'mines'
    }
    
    def __init__(self):
        pass
    
    def parse(self, query: str) -> Dict[str, Any]:
        """Parse a natural language query"""
        query_lower = query.lower()
        
        result = {
            "original_query": query,
            "intent": None,
            "location": None,
            "date_from": None,
            "date_to": None,
            "confidence": 0.0
        }
        
        # Extract location
        location = self._extract_location(query_lower)
        if location:
            result["location"] = location
            result["confidence"] += 0.3
        
        # Extract dates
        dates = self._extract_dates(query_lower)
        if dates["from"]:
            result["date_from"] = dates["from"]
            result["confidence"] += 0.2
        if dates["to"]:
            result["date_to"] = dates["to"]
            result["confidence"] += 0.2
        
        # Determine intent
        intent = self._determine_intent(query_lower)
        if intent:
            result["intent"] = intent
            result["confidence"] += 0.3
        
        # Default values
        if not result["location"]:
            result["location"] = "India"
        if not result["date_from"]:
            result["date_from"] = date.today() - timedelta(days=365)
        if not result["date_to"]:
            result["date_to"] = date.today()
        if not result["intent"]:
            result["intent"] = "change_detection"
        
        return result
    
    def _extract_location(self, query: str) -> Optional[str]:
        """Extract location from query"""
        # Check for Indian cities
        for location in self.INDIA_LOCATIONS:
            if location in query:
                # Return proper casing
                return location.title()
        
        # Check for generic location patterns
        patterns = [
            r'in\s+([a-z\s]+?)(?:\s+between|\s+from|\s+since|\s+in\s+\d{4}|$)',
            r'near\s+([a-z\s]+?)(?:\s+between|\s+from|\s+since|\s+in\s+\d{4}|$)',
            r'around\s+([a-z\s]+?)(?:\s+between|\s+from|\s+since|\s+in\s+\d{4}|$)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, query)
            if match:
                location = match.group(1).strip()
                if len(location) > 2:  # Filter out short matches
                    return location.title()
        
        return None
    
    def _extract_dates(self, query: str) -> Dict[str, Optional[date]]:
        """Extract date range from query"""
        result = {"from": None, "to": None}
        
        # Pattern: 2022-2025
        dash_match = re.search(r'(\d{4})\s*-\s*(\d{4})', query)
        if dash_match:
            result["from"] = date(int(dash_match.group(1)), 1, 1)
            result["to"] = date(int(dash_match.group(2)), 12, 31)
            return result
        
        # Pattern: between 2024 and 2025
        between_match = re.search(r'between\s+(\d{4})\s+and\s+(\d{4})', query)
        if between_match:
            result["from"] = date(int(between_match.group(1)), 1, 1)
            result["to"] = date(int(between_match.group(2)), 12, 31)
            return result
        
        # Pattern: from 2024 to 2025
        from_to_match = re.search(r'from\s+(\d{4})\s+to\s+(\d{4})', query)
        if from_to_match:
            result["from"] = date(int(from_to_match.group(1)), 1, 1)
            result["to"] = date(int(from_to_match.group(2)), 12, 31)
            return result
        
        # Pattern: in 2024
        year_match = re.search(r'in\s+(\d{4})', query)
        if year_match:
            year = int(year_match.group(1))
            result["from"] = date(year, 1, 1)
            result["to"] = date(year, 12, 31)
            return result
        
        # Pattern: since 2024
        since_match = re.search(r'since\s+(\d{4})', query)
        if since_match:
            result["from"] = date(int(since_match.group(1)), 1, 1)
            result["to"] = date.today()
            return result
        
        # Pattern: last X years
        last_x_years_match = re.search(r'(?:last|past)\s+(\d+)\s+years?', query)
        if last_x_years_match:
            years = int(last_x_years_match.group(1))
            result["from"] = date.today() - timedelta(days=365 * years)
            result["to"] = date.today()
            return result
            
        # Pattern: last year, this year, etc.
        if 'last year' in query:
            last_year = date.today().year - 1
            result["from"] = date(last_year, 1, 1)
            result["to"] = date(last_year, 12, 31)
        elif 'this year' in query:
            this_year = date.today().year
            result["from"] = date(this_year, 1, 1)
            result["to"] = date.today()
        elif 'last 6 months' in query or 'past 6 months' in query:
            result["from"] = date.today() - timedelta(days=180)
            result["to"] = date.today()
        elif 'last year' in query or 'past year' in query or 'last 12 months' in query:
            result["from"] = date.today() - timedelta(days=365)
            result["to"] = date.today()
        
        return result
    
    def _determine_intent(self, query: str) -> Optional[str]:
        """Determine the query intent"""
        # Check for change detection intent
        for keyword in self.CHANGE_KEYWORDS:
            if keyword in query:
                if keyword in ['construction', 'building', 'development', 'urbanization']:
                    return 'construction'
                elif keyword in ['deforestation', 'forest', 'trees']:
                    return 'deforestation'
                elif keyword in ['agriculture', 'crop', 'farm']:
                    return 'agriculture'
                elif keyword in ['water', 'lake', 'river']:
                    return 'water'
                else:
                    return 'change_detection'
        
        # Check for search intent
        for keyword in self.SEARCH_KEYWORDS:
            if keyword in query:
                return 'visual_search'
        
        # Default intent
        return 'change_detection'
