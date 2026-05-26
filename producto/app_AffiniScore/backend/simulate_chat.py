from database import supabase
from datetime import datetime
import os

# El GROQ_API_KEY se carga automáticamente desde el archivo .env mediante la base de datos.

def simulate_chat():
    id_usuario = "7d36be0e-f826-4492-91fa-b61cbf59a381"
    message = "Hola, probando chat grupal"
    
    try:
        print("1. Querying active partnership...")
        p_res = supabase.table("partnerships").select("id").or_(f"user1_id.eq.{id_usuario},user2_id.eq.{id_usuario}").eq("status", "active").execute()
        print("Partnership res:", p_res.data)
        
        partnership_id = p_res.data[0]["id"]
        
        print("2. Querying profiles for user...")
        profile_res = supabase.table("profiles").select("full_name").eq("id", id_usuario).execute()
        print("Profile res:", profile_res.data)
        
        emisor_name = profile_res.data[0].get("full_name") or "Usuario"
        print("Emisor name resolved:", emisor_name)
        
        # 3. Guardar mensaje del usuario
        user_msg_data = {
            "room_id": str(partnership_id),
            "sender_id": id_usuario,
            "sender_type": "USER",
            "message": message,
            "metadata": {"emisor": emisor_name, "canal": 3},
            "created_at": datetime.utcnow().isoformat()
        }
        print("4. Inserting user message...")
        res_insert = supabase.table("chat_messages").insert(user_msg_data).execute()
        print("User message inserted successfully:", res_insert.data)
        
        # 4. Check if GROQ_API_KEY is correct and get response
        print("5. Getting GROQ AI Response...")
        import httpx
        system_prompt = "Eres AffiniCoach, un terapeuta de parejas experto. Estás moderando y aportando valor en un chat grupal de pareja."
        
        with httpx.Client() as client:
            response = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {os.environ['GROQ_API_KEY']}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "mixtral-8x7b-32768",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": message}
                    ]
                },
                timeout=15.0
            )
            print("GROQ Response Status:", response.status_code)
            print("GROQ Response Data:", response.json())
            
    except Exception as e:
        print("!!! ERROR CRASHED !!!")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    simulate_chat()
