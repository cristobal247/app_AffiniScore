import os
import requests
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

if not url or not key:
    print("Missing env vars")
    exit(1)

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}"
}

try:
    res = requests.get(f"{url}/rest/v1/?apikey={key}", headers=headers)
    res.raise_for_status()
    spec = res.json()
    paths = spec.get("paths", {})
    definitions = spec.get("definitions", {})
    
    print("Tables in OpenAPI:")
    for table in definitions.keys():
        print(f"\nTable: {table}")
        properties = definitions[table].get("properties", {})
        for prop, details in properties.items():
            print(f"  - {prop}: {details.get('type')} (Format: {details.get('format')}, Enum: {details.get('enum')})")
            
except Exception as e:
    print("Error:", e)
