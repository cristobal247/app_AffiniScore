from database import supabase

def check():
    try:
        res = supabase.table("profiles").select("*").limit(1).execute()
        if res.data:
            print("profiles columns:", res.data[0].keys())
        else:
            print("No rows in profiles table")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check()
