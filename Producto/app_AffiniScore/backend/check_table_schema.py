from database import supabase

def check():
    try:
        # Check user_disconnect_challenges
        res = supabase.table("user_disconnect_challenges").select("*").limit(1).execute()
        print("user_disconnect_challenges columns:", res.data[0].keys() if res.data else "No rows, but table exists")
        
        # Check profiles
        res = supabase.table("profiles").select("*").limit(1).execute()
        print("profiles columns:", res.data[0].keys() if res.data else "No rows")

        # Check points_ledger
        res = supabase.table("points_ledger").select("*").limit(1).execute()
        print("points_ledger columns:", res.data[0].keys() if res.data else "No rows")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check()
