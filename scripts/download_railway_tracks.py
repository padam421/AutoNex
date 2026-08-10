import requests
import json
import os

output_dir = r"c:\Users\Padam Kishore\Pictures\PROJECT-KAVACH\data\geojson"
os.makedirs(output_dir, exist_ok=True)

url = "https://overpass-api.de/api/interpreter"

# Delhi-Mumbai bounding box - all railway tracks
query = '[out:json][timeout:120];(way["railway"="rail"](18.9,72.8,28.7,77.2););out geom;'

headers = {
    'User-Agent': 'ProjectKavachSIH/1.0 (padamkishore@example.com)',
}

print("[TRAIN] Downloading Delhi-Mumbai railway track data from official Overpass API...")
print("[WAIT] Please wait, fetching data...")

try:
    response = requests.post(url, data={'data': query}, headers=headers, timeout=120)
    print(f"[API] Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        elements = data.get('elements', [])
        print(f"[OK] SUCCESS! Downloaded {len(elements)} railway track segments!")
        
        # Save raw JSON
        raw_path = os.path.join(output_dir, "india_railway_tracks_raw.json")
        with open(raw_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        file_size_mb = os.path.getsize(raw_path) / (1024 * 1024)
        print(f"[SAVE] Raw JSON saved: {raw_path} ({file_size_mb:.2f} MB)")
        
        # Convert to GeoJSON format
        geojson = {
            "type": "FeatureCollection",
            "features": []
        }
        
        for element in elements:
            if element.get('type') == 'way' and 'geometry' in element:
                coordinates = [[node['lon'], node['lat']] for node in element['geometry']]
                feature = {
                    "type": "Feature",
                    "properties": {
                        "id": element.get('id'),
                        "railway": element.get('tags', {}).get('railway', 'rail'),
                        "name": element.get('tags', {}).get('name', ''),
                        "gauge": element.get('tags', {}).get('gauge', ''),
                        "electrified": element.get('tags', {}).get('electrified', ''),
                        "maxspeed": element.get('tags', {}).get('maxspeed', ''),
                    },
                    "geometry": {
                        "type": "LineString",
                        "coordinates": coordinates
                    }
                }
                geojson["features"].append(feature)
        
        geojson_path = os.path.join(output_dir, "india_railway_tracks.geojson")
        with open(geojson_path, 'w', encoding='utf-8') as f:
            json.dump(geojson, f, ensure_ascii=False, indent=2)
        geojson_size_mb = os.path.getsize(geojson_path) / (1024 * 1024)
        print(f"[MAP] GeoJSON saved: {geojson_path} ({geojson_size_mb:.2f} MB)")
        print(f"[DATA] Total features in GeoJSON: {len(geojson['features'])}")
        print(f"\n[DONE] Railway tracks successfully downloaded and processed!")
    else:
        print(f"[ERROR] Status Code: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
except requests.exceptions.Timeout:
    print("[TIMEOUT] Request timed out. Overpass server busy, retry in a few seconds.")
except Exception as e:
    print(f"[ERROR] Error: {e}")
