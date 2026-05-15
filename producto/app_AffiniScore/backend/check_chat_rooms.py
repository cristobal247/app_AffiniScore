from database import supabase
import json

def check_chat_rooms():
    try:
        res = supabase.table("chat_rooms").select("*").limit(1).execute()
        if res.data:
            print("Columns in chat_rooms:", res.data[0].keys())
        else:
            print("No data in chat_rooms table.")
    except Exception as e:
        print("Error checking chat_rooms:", e)

if __name__ == "__main__":
    check_chat_rooms()
