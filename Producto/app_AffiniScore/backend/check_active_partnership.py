from database import supabase

def check_user_partnership():
    uid = "7d36be0e-f826-4492-91fa-b61cbf59a381"
    print("Checking partnership for user:", uid)
    
    p_res = supabase.table("partnerships").select("*").or_(f"user1_id.eq.{uid},user2_id.eq.{uid}").execute()
    print("Partnerships found:", p_res.data)
    
    profile_res = supabase.table("profiles").select("*").eq("id", uid).execute()
    print("Profile found:", profile_res.data)

if __name__ == "__main__":
    check_user_partnership()
