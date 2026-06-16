from database import supabase
import json

def check_schema():
    try:
        # Try to fetch one row from profiles
        res = supabase.table("profiles").select("*").limit(1).execute()
        if res.data:
            print("Columns in profiles:", res.data[0].keys())
        else:
            print("No data in profiles table to check columns.")
            # Try to fetch table info via RPC or just select a likely column
            res = supabase.table("profiles").select("id").limit(1).execute()
            print("Profile table exists, but is empty.")
    except Exception as e:
        print("Error checking schema:", e)

if __name__ == "__main__":
    check_schema()
