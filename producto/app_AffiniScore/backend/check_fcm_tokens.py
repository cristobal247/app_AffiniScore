import os
from database import supabase

res = supabase.table("profiles").select("id, fcm_token").execute()
print("PROFILES & TOKENS:")
for row in res.data:
    print(f"ID: {row.get('id')}, FCM Token: {row.get('fcm_token')}")
