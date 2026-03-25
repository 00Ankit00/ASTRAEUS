import httpx
import asyncio

async def test():
    bbox = "28.5638954,77.1590057,28.6638954,77.2590057"
    query = f"""
    [out:json][timeout:60];
    (
      way["building"="construction"]({bbox});
      way["landuse"="construction"]({bbox});
      way["highway"="construction"]({bbox});
    );
    out geom;
    """
    async with httpx.AsyncClient() as client:
        res = await client.get("http://overpass-api.de/api/interpreter", params={'data': query}, timeout=60.0)
        print(f"Status: {res.status_code}")
        if res.status_code != 200:
            print("Raw Output:", res.text[:500])
        else:
            data = res.json()
            print(f"Elements: {len(data.get('elements', []))}")

asyncio.run(test())
