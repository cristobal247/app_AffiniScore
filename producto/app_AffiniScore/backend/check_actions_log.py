from database import supabase

def run():
    try:
        res = supabase.table("user_actions_log").select("*").limit(1).execute()
        if res.data:
            print("user_actions_log columns:", res.data[0].keys())
        else:
            print("user_actions_log is empty, but query succeeded.")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    run()
