from fastapi import APIRouter, HTTPException, Path, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
import httpx
from database import supabase

router = APIRouter()

class ChatMessagePayload(BaseModel):
    message: str
    image_url: Optional[str] = None
    sender_id: Optional[str] = None

async def get_groq_ai_response(user_message: str, is_group: bool) -> str:
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_api_key:
        return "Respuesta simulada de la IA (API Key no configurada)"
        
    system_prompt = "Eres AffiniCoach, un terapeuta de parejas experto."
    if is_group:
        system_prompt += " Estás moderando y aportando valor en un chat grupal de pareja."
    else:
        system_prompt += " Estás hablando en una sesión individual."

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "mixtral-8x7b-32768",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ]
                },
                timeout=15.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Error comunicándose con Groq: {e}")
        return "Lo siento, tuve un problema procesando tu mensaje."

@router.post("/api/chat/{room_id}/{emisor}")
async def process_chat_message(
    payload: ChatMessagePayload,
    room_id: str = Path(..., description="ID de la sala (UUID)"),
    emisor: str = Path(..., description="Nombre del usuario"),
    canal_id: int = Query(1, description="1: Pareja, 2: Indiv+IA, 3: Grupal+IA")
):
    timestamp = datetime.utcnow().isoformat()
    
    user_msg_data = {
        "room_id": room_id,
        "sender_id": payload.sender_id,
        "sender_type": "USER",
        "message": payload.message,
        "metadata": {"emisor": emisor, "image_url": payload.image_url},
        "created_at": timestamp
    }

    try:
        supabase.table("chat_messages").insert(user_msg_data).execute()

        if canal_id == 1:
            return {"success": True, "user_message": user_msg_data}
            
        elif canal_id in [2, 3]:
            is_group = (canal_id == 3)
            ai_text = await get_groq_ai_response(payload.message, is_group)
            
            ai_msg_data = {
                "room_id": room_id,
                "sender_id": None,
                "sender_type": "AI",
                "message": ai_text,
                "metadata": {"emisor": "AffiniCoach IA"},
                "created_at": datetime.utcnow().isoformat()
            }
            supabase.table("chat_messages").insert(ai_msg_data).execute()
            
            return {"success": True, "user_message": user_msg_data, "ai_response": ai_msg_data}
        else:
            raise HTTPException(status_code=400, detail="canal_id inválido")
            
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/chat/3/{id_usuario}")
async def process_group_chat_3_message(
    payload: ChatMessagePayload,
    id_usuario: str = Path(..., description="ID del usuario emisor")
):
    """
    Endpoint específico para el Canal 3: Chat Grupal (Pareja + Terapeuta IA).
    Identifica automáticamente la sala (partnership_id) del usuario.
    """
    try:
        # 1. Obtener partnership_id desde la tabla 'partnerships' (porque en 'profiles' no existe la columna)
        p_res = supabase.table("partnerships").select("id").or_(f"user1_id.eq.{id_usuario},user2_id.eq.{id_usuario}").eq("status", "active").execute()
        
        if not p_res.data:
            raise HTTPException(status_code=400, detail="El usuario no tiene una pareja vinculada activa")
            
        partnership_id = p_res.data[0]["id"]

        # Obtener el nombre del perfil
        profile_res = supabase.table("profiles").select("full_name").eq("id", id_usuario).execute()
        emisor_name = profile_res.data[0].get("full_name", "Usuario") if profile_res.data else "Usuario"
        
        # 2. Guardar mensaje del usuario
        user_msg_data = {
            "room_id": str(partnership_id),
            "sender_id": id_usuario,
            "sender_type": "USER",
            "message": payload.message,
            "metadata": {"emisor": emisor_name, "canal": 3},
            "created_at": datetime.utcnow().isoformat()
        }
        supabase.table("chat_messages").insert(user_msg_data).execute()
        
        # 3. Obtener respuesta de la IA configurada como moderadora grupal
        ai_text = await get_groq_ai_response(payload.message, is_group=True)
        
        # 4. Guardar respuesta de la IA
        ai_msg_data = {
            "room_id": str(partnership_id),
            "sender_id": None,
            "sender_type": "AI",
            "message": ai_text,
            "metadata": {"emisor": "AffiniCoach IA", "canal": 3},
            "created_at": datetime.utcnow().isoformat()
        }
        supabase.table("chat_messages").insert(ai_msg_data).execute()
        
        return {
            "success": True, 
            "user_message": user_msg_data, 
            "ai_response": ai_msg_data
        }
        
    except Exception as e:
        print(f"Error en endpoint chat canal 3: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))
