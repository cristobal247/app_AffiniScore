from database import supabase
import json

def check_partnerships():
    try:
        res = supabase.table("partnerships").select("*").limit(1).execute()
        if res.data:
            print("Columns in partnerships:", res.data[0].keys())
        else:
            print("No data in partnerships table.")
    except Exception as e:
        print("Error checking partnerships:", e)

if __name__ == "__main__":
    check_partnerships()
