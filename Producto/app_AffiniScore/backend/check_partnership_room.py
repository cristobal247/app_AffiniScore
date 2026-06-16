from database import supabase

def check_partnership_room():
    pid = "4182851e-2210-411a-b49a-fa8407bebe33"
    print("Checking rooms for partnership:", pid)
    
    # 1. Check all rooms with this partnership_id
    res = supabase.table("chat_rooms").select("*").eq("partnership_id", pid).execute()
    print("Rooms found by partnership_id:", res.data)
    
    # 2. Check if a room with ID equal to partnership_id exists
    res_by_id = supabase.table("chat_rooms").select("*").eq("id", pid).execute()
    print("Rooms found by id=partnership_id:", res_by_id.data)

if __name__ == "__main__":
    check_partnership_room()
