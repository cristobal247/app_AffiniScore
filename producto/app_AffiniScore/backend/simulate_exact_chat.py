from database import supabase
from datetime import datetime
import os
import httpx

# El GROQ_API_KEY se carga automáticamente desde el archivo .env mediante la base de datos.

def simulate_exact_chat():
    id_usuario = "7d36be0e-f826-4492-91fa-b61cbf59a381"
    message_text = "Hola, probando chat grupal desde simulador exacto"
    
    try:
        print("1. Querying active partnership...")
        p_res = supabase.table("partnerships").select("id").or_(f"user1_id.eq.{id_usuario},user2_id.eq.{id_usuario}").eq("status", "active").execute()
        partnership_id = p_res.data[0]["id"]
        print("Partnership ID:", partnership_id)
        
        print("2. Querying profile...")
        profile_res = supabase.table("profiles").select("full_name").eq("id", id_usuario).execute()
        
        # EXACT SAME LINE AS THE BACKEND:
        emisor_name = profile_res.data[0].get("full_name", "Usuario") if profile_res.data else "Usuario"
        print("Emisor name resolved:", emisor_name)
        
        # 3. Guardar mensaje del usuario
        user_msg_data = {
            "room_id": str(partnership_id),
            "sender_id": id_usuario,
            "sender_type": "USER",
            "message": message_text,
            "metadata": {"emisor": emisor_name, "canal": 3},
            "created_at": datetime.utcnow().isoformat()
        }
        print("4. Inserting user message...")
        supabase.table("chat_messages").insert(user_msg_data).execute()
        print("Inserted user message successfully!")
        
        # 4. Get Groq AI response
        print("5. Getting GROQ AI Response...")
        system_prompt = "Eres AffiniCoach, un terapeuta de parejas experto. Estás moderando y aportando valor en un chat grupal de pareja."
        
        groq_api_key = os.environ.get("GROQ_API_KEY", "")
        ai_text = "Respuesta simulada por error de API"
        if groq_api_key:
            try:
                response = httpx.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {groq_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "mixtral-8x7b-32768",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": message_text}
                        ]
                    },
                    timeout=15.0
                )
                response.raise_for_status()
                data = response.json()
                ai_text = data["choices"][0]["message"]["content"]
            except Exception as e:
                print("Groq API error caught:", e)
                ai_text = "Lo siento, tuve un problema procesando tu mensaje."
        
        print("AI Text:", ai_text)
        
        # 5. Guardar respuesta de la IA
        ai_msg_data = {
            "room_id": str(partnership_id),
            "sender_id": None,
            "sender_type": "AI",
            "message": ai_text,
            "metadata": {"emisor": "AffiniCoach IA", "canal": 3},
            "created_at": datetime.utcnow().isoformat()
        }
        print("6. Inserting AI message...")
        supabase.table("chat_messages").insert(ai_msg_data).execute()
        print("Inserted AI message successfully!")
        
    except Exception as e:
        print("!!! ERROR CRASHED !!!")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    simulate_exact_chat()
