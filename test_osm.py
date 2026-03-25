import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        # Mumbai bbox roughly
        bbox = "19.0,72.8,19.1,72.9"
        years = [2022, 2023]
        tasks = []
        for y in years:
            osm_query = f'[date:"{y}-01-01T00:00:00Z"][out:json][timeout:15];(way["landuse"="forest"]({bbox});way["natural"="wood"]({bbox}););out count;'
            tasks.append(client.get("http://overpass-api.de/api/interpreter", params={'data': osm_query}, timeout=15))
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        for r in responses:
            if isinstance(r, httpx.Response):
                try:
                    data = r.json()
                    print("Forest ways:", int(data['elements'][0]['tags']['ways']))
                except Exception as e:
                    print("Error parsing", e, r.text)
            else:
                print("Request failed", r)

if __name__ == "__main__":
    asyncio.run(test())
