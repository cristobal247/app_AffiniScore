from database import supabase

def create_group_chat_room():
    pid = "4182851e-2210-411a-b49a-fa8407bebe33"
    print("Checking if room exists...")
    res = supabase.table("chat_rooms").select("id").eq("id", pid).execute()
    
    if not res.data:
        print("Room does not exist. Creating room in live database...")
        new_room = {
            "id": pid,
            "partnership_id": pid,
            "room_type": "GROUP_AI",
            "title": "Terapia Grupal"
        }
        insert_res = supabase.table("chat_rooms").insert(new_room).execute()
        print("Success! Room created:", insert_res.data)
    else:
        print("Room already exists:", res.data)

if __name__ == "__main__":
    create_group_chat_room()
