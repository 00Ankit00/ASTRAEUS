"""
Astraeus Chat Service
Groq LLM + real per-year OpenStreetMap Overpass data engine
"""
import json
import asyncio
import httpx
from groq import Groq

GROQ_API_KEY = "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"

DOMAIN_KEYWORDS = [
    'satellite', 'imag', 'deforest', 'forest', 'construct', 'build',
    'urban', 'industrial', 'water', 'lake', 'river', 'change', 'develop',
    'metric', 'stat', 'geospatial', 'orbit', 'map', 'tree', 'vegetat',
    'structur', 'expansion', 'area', 'region', 'zone', 'land', 'cover',
    'infrastructure', 'growth', 'sprawl', 'environment', 'ndvi', 'emission',
    'mumbai', 'delhi', 'bangalore', 'bengaluru', 'chennai', 'kolkata',
    'hyderabad', 'pune', 'india', 'city', 'district'
]

OUT_OF_SCOPE_MSG = (
    "⚠️ **Command out of scope.** I am *Astraeus Intelligence* — a specialized geospatial analysis unit. "
    "I process orbital telemetry, urban growth metrics, deforestation signals, and structural change detection.\n\n"
    "Please reformulate your query around **satellite imagery, land use change, deforestation, or urban development**."
)


def _resolve_location(query_lower: str, parsed_location) -> str:
    if not isinstance(parsed_location, str) or not parsed_location or parsed_location.lower() == "india":
        for city in ['mumbai', 'delhi', 'bangalore', 'bengaluru', 'chennai', 'kolkata', 'hyderabad', 'pune']:
            if city in query_lower:
                return city.replace('bengaluru', 'bangalore').title()
        return "Mumbai"
    return parsed_location.title()


def _year_range(date_from, date_to):
    start = date_from.year if date_from else 2018
    end   = date_to.year   if date_to   else 2025
    if start >= end:      end   = start + 2
    if end - start > 8:   start = end - 8
    return [str(y) for y in range(start, end + 1)]


async def _geocode(location: str):
    """Returns (lat, lon) or raises ValueError."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": location, "format": "json", "limit": 1},
            headers={"User-Agent": "Astraeus-Engine/2.0"}
        )
        data = r.json()
        if not data:
            raise ValueError(f"No geocoding result for '{location}'")
        return float(data[0]["lat"]), float(data[0]["lon"])


async def _overpass_count(bbox: str, year: str, kind: str) -> int:
    ts = f"{year}-06-01T00:00:00Z"
    if kind == "water":
        q = f'[date:"{ts}"][out:json][timeout:12];(way["natural"="water"]({bbox});way["waterway"]({bbox}););out count;'
    elif kind == "forest":
        q = f'[date:"{ts}"][out:json][timeout:12];(way["landuse"="forest"]({bbox});way["natural"="wood"]({bbox}););out count;'
    else:
        q = f'[date:"{ts}"][out:json][timeout:12];way["building"]({bbox});out count;'
    try:
        async with httpx.AsyncClient() as c:
            r = await c.get("http://overpass-api.de/api/interpreter", params={"data": q}, timeout=15.0)
            return int(r.json()["elements"][0]["tags"]["ways"])
    except Exception:
        return -1


def _interpolate(counts: list) -> list:
    result = list(counts)
    for i, v in enumerate(result):
        if v == -1:
            prev = next((result[j] for j in range(i-1, -1, -1)          if result[j] != -1), None)
            nxt  = next((result[j] for j in range(i+1, len(result))      if result[j] != -1), None)
            if prev is not None and nxt is not None:
                result[i] = (prev + nxt) // 2
            elif prev is not None:
                result[i] = prev
            elif nxt is not None:
                result[i] = nxt
            else:
                result[i] = 0
    return result


def _build_chart(years, primary_counts, primary_label, primary_color,
                 is_deforest, bld_counts, location, start_year, end_year) -> str:
    is_line = is_deforest

    series = {
        "x": years, "y": primary_counts,
        "type": "scatter" if is_line else "bar",
        "name": primary_label,
    }
    if is_line:
        series["mode"] = "lines+markers"
        series["line"] = {"color": primary_color, "width": 3}
    else:
        series["marker"] = {"color": primary_color}

    data = [series]

    if is_deforest and bld_counts:
        data.append({
            "x": years, "y": bld_counts, "type": "bar",
            "name": "Urban Buildings (OSM)",
            "marker": {"color": "#f59e0b", "opacity": 0.75}
        })
        title = f"Forest Cover vs Urban Expansion — {location} ({start_year}–{end_year})"
    else:
        label_prefix = primary_label.split(" ")[0]
        title = f"{label_prefix} Growth — {location} ({start_year}–{end_year})"

    layout = {
        "title": title,
        "paper_bgcolor": "rgba(0,0,0,0)",
        "plot_bgcolor":  "rgba(0,0,0,0)",
        "font": {"color": "#94a3b8", "family": "Inter"},
        "xaxis": {"gridcolor": "#1e293b", "showgrid": True, "title": "Year"},
        "yaxis": {"gridcolor": "#1e293b", "showgrid": True, "title": "OSM Element Count"},
        "margin": {"l": 55, "r": 20, "t": 60, "b": 40},
        "legend": {"orientation": "h", "y": -0.25}
    }
    return json.dumps({"plot": True, "data": data, "layout": layout}, indent=2)


def _groq_narrative(query: str, location: str, years: list, counts: list,
                    primary_label: str, start_year: str, end_year: str) -> str:
    osm_summary = ", ".join(f"{y}: {c}" for y, c in zip(years, counts))
    system_prompt = (
        "You are Astraeus, an elite satellite geospatial intelligence assistant. "
        "Write concise professional markdown reports using only the data provided. "
        "Bold all key numbers. Never invent statistics. Max 4 paragraphs. "
        "End with exactly one follow-up question."
    )
    user_prompt = (
        f'User query: "{query}"\n\n'
        f"Real OSM telemetry — {location}, {primary_label} (mid-year snapshot per year):\n{osm_summary}\n\n"
        f"Time window: {start_year}–{end_year}. Analyze the trend, highlight notable shifts, give geospatial context."
    )
    try:
        gc = Groq(api_key=GROQ_API_KEY)
        resp = gc.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt}
            ],
            max_tokens=600, temperature=0.4
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return (
            f"**{location} — {primary_label} ({start_year}–{end_year})**\n\n"
            f"Real OSM counts per year: {osm_summary}.\n\n*(Groq LLM unavailable: {e})*"
        )


async def handle_chat(query: str, parsed: dict) -> dict:
    """Main entry point called by the FastAPI route."""
    query_lower = query.lower()

    if not any(kw in query_lower for kw in DOMAIN_KEYWORDS):
        return {"reply": OUT_OF_SCOPE_MSG}

    location  = _resolve_location(query_lower, parsed.get("location"))
    years     = _year_range(parsed.get("date_from"), parsed.get("date_to"))
    start_year, end_year = years[0], years[-1]

    # Geocode
    try:
        lat, lon = await _geocode(location)
    except Exception as e:
        return {"reply": f"🛰️ **Geocoding failed** for *{location}*: `{e}`"}

    bbox = f"{lat-0.045},{lon-0.045},{lat+0.045},{lon+0.045}"

    is_deforest = any(kw in query_lower for kw in ['deforest', 'forest', 'tree', 'vegetat', 'ndvi'])
    is_water    = any(kw in query_lower for kw in ['water', 'lake', 'river', 'flood'])
    kind        = "water" if is_water else ("forest" if is_deforest else "building")

    # Fetch real per-year counts concurrently
    raw = await asyncio.gather(*[_overpass_count(bbox, y, kind) for y in years])
    counts = _interpolate(list(raw))

    primary_label = "Waterways (OSM)" if is_water else ("Forest/Wood Ways (OSM)" if is_deforest else "Buildings (OSM)")
    primary_color = "#22d3ee" if is_water else ("#22c55e" if is_deforest else "#3b82f6")

    # Building overlay for deforestation queries
    bld_counts = None
    if is_deforest:
        bld_raw = await asyncio.gather(*[_overpass_count(bbox, y, "building") for y in years])
        bld_counts = _interpolate(list(bld_raw))

    chart_json = _build_chart(
        years, counts, primary_label, primary_color,
        is_deforest, bld_counts, location, start_year, end_year
    )
    narrative = _groq_narrative(query, location, years, counts, primary_label, start_year, end_year)

    return {"reply": f"{narrative}\n\n```json\n{chart_json}\n```"}
