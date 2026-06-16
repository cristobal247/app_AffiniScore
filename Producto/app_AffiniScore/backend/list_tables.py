from database import supabase

def run():
    try:
        # We can run an RPC or query postgrest to see table list
        # E.g. query information_schema or perform queries on potential tables
        potential_tables = [
            "profiles", "partnerships", "user_actions_log", "points_ledger", 
            "memories", "geozones", "chat_rooms", "chat_messages", 
            "pending_points", "daily_reflections", "monthly_affinity"
        ]
        for table in potential_tables:
            try:
                res = supabase.table(table).select("*").limit(1).execute()
                print(f"Table '{table}' exists. Rows: {len(res.data) if res.data else 0}")
            except Exception as e:
                print(f"Table '{table}' does NOT exist or error: {e}")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    run()
