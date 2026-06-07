from database import supabase
from datetime import datetime

def test():
    try:
        user_id = "7d36be0e-f826-4492-91fa-b61cbf59a381"
        res = supabase.table("profiles").update({
            "total_points": 100,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", user_id).execute()
        print("Success:", res.data)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test()
