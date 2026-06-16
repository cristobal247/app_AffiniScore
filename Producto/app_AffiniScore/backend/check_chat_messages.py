from database import supabase
import json

def check_chat_messages():
    try:
        res = supabase.table("chat_messages").select("*").limit(1).execute()
        if res.data:
            print("Columns in chat_messages:", res.data[0].keys())
        else:
            print("No data in chat_messages table.")
    except Exception as e:
        print("Error checking chat_messages:", e)

if __name__ == "__main__":
    check_chat_messages()
