from fastapi import APIRouter, HTTPException, Path, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
import httpx
import random
from database import supabase

router = APIRouter()
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

async def get_groq_ai_response(user_message: str, is_group: bool, image_url: Optional[str] = None) -> str:
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY no encontrada en el entorno del servidor.")
        
    model = "llama-3.2-11b-vision-preview" if image_url else "llama-3.3-70b-versatile"

    base_prompt = (
        "Eres AffiniCoach, un terapeuta de parejas de élite con más de 15 años de experiencia clínica. "
        "Te especializas en relaciones de pareja, comunicación asertiva y resolución de conflictos utilizando marcos probados "
        "como el Método Gottman (fomentar la amistad, manejar el conflicto, crear sentido compartido), "
        "la Terapia Focalizada en las Emociones (TFE) y la Comunicación No Violenta (CNV).\n\n"
        
        "TUS DIRECTRICES DE COMPORTAMIENTO:\n"
        "1. TONO: Cálido, empático, profesional, equilibrado y profundamente alentador.\n"
        "2. SIN FAVORITISMOS: En el chat grupal, mantén una neutralidad absoluta. Jamás tomes partido por ninguno de los dos. "
        "Si uno de los dos expresa una queja, valida su emoción, pero invita al otro a expresarse con empatía.\n"
        "3. LENGUAJE EMOCIONAL: Ayuda a la pareja a traducir la culpa ('tú siempre haces...', 'por tu culpa...') "
        "en expresiones de vulnerabilidad e impacto personal ('me siento solo/a cuando...', 'necesito apoyo en...').\n"
        "4. EJERCICIOS PRÁCTICOS: Cuando el ambiente esté tenso o te pidan guía, propone micro-ejercicios prácticos de conexión "
        "(ej. la pausa de respiración compartida, turnos de escucha activa sin interrupción por 2 minutos, o expresar una gratitud diaria).\n"
        "5. FORMATO MÓVIL: Tus respuestas deben caber en burbujas de chat de celular. Sé conciso y claro. "
        "Escribe un máximo de 2 a 3 párrafos cortos. Usa viñetas para ejercicios y emojis con moderación (ej. 💖, 🤝, 💬, 🧘) "
        "para mantener un aire moderno, premium y cercano.\n"
        "6. IDIOMA: Responde siempre en un español natural, cálido y comprensible."
    )

    if is_group:
        system_prompt = (
            f"{base_prompt}\n\n"
            "CONTEXTO ACTUAL: Chat Grupal de Pareja. Estás interactuando con ambos miembros a la vez. "
            "Tu rol es actuar como un moderador sabio, pacificador y facilitador de puentes de conexión. "
            "Fomenta la interacción entre ellos y haz preguntas abiertas para que dialoguen directamente."
        )
    else:
        system_prompt = (
            f"{base_prompt}\n\n"
            "CONTEXTO ACTUAL: Sesión Individual. El usuario está hablando contigo en privado. "
            "Bríndale un espacio seguro de desahogo y autorreflexión, pero siempre ayúdale a enfocar cómo "
            "puede aportar de manera constructiva a la relación y entender la perspectiva de su pareja."
        )

    # Preparar el contenido para Groq
    user_content = user_message
    if image_url:
        user_content = [
            {"type": "text", "text": user_message},
            {"type": "image_url", "image_url": {"url": image_url}}
        ]

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ]
                },
                timeout=12.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"Error llamando a la API de Groq: {e}")
        raise HTTPException(status_code=502, detail=f"Error al conectar con el servicio de IA: {str(e)}")

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

        # Asegurar que exista la sala de chat grupal (GROUP_AI)
        room_check = supabase.table("chat_rooms").select("id").eq("id", partnership_id).execute()
        if not room_check.data:
            new_room = {
                "id": str(partnership_id),
                "partnership_id": str(partnership_id),
                "room_type": "GROUP_AI",
                "title": "Terapia Grupal"
            }
            supabase.table("chat_rooms").insert(new_room).execute()

        # Obtener el nombre del perfil
        profile_res = supabase.table("profiles").select("full_name").eq("id", id_usuario).execute()
        emisor_name = profile_res.data[0].get("full_name", "Usuario") if profile_res.data else "Usuario"
        
        # 2. Guardar mensaje del usuario
        user_metadata = {"emisor": emisor_name, "canal": 3}
        if payload.image_url:
            user_metadata["image_url"] = payload.image_url

        user_msg_data = {
            "room_id": str(partnership_id),
            "sender_id": id_usuario,
            "sender_type": "USER",
            "message": payload.message,
            "metadata": user_metadata,
            "created_at": datetime.utcnow().isoformat()
        }
        user_res = supabase.table("chat_messages").insert(user_msg_data).execute()
        inserted_user = user_res.data[0] if (user_res.data and len(user_res.data) > 0) else user_msg_data
        
        # 3. Obtener respuesta de la IA configurada como moderadora grupal
        ai_text = await get_groq_ai_response(payload.message, is_group=True, image_url=payload.image_url)
        
        # 4. Guardar respuesta de la IA
        ai_msg_data = {
            "room_id": str(partnership_id),
            "sender_id": None,
            "sender_type": "AI",
            "message": ai_text,
            "metadata": {
                "emisor": "AffiniCoach IA", 
                "canal": 3,
                "fuente": "Groq API"
            },
            "created_at": datetime.utcnow().isoformat()
        }
        ai_res = supabase.table("chat_messages").insert(ai_msg_data).execute()
        inserted_ai = ai_res.data[0] if (ai_res.data and len(ai_res.data) > 0) else ai_msg_data
        
        return {
            "success": True, 
            "user_message": inserted_user, 
            "ai_response": inserted_ai
        }
        
    except Exception as e:
        print(f"Error en endpoint chat canal 3: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

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
        user_res = supabase.table("chat_messages").insert(user_msg_data).execute()
        inserted_user = user_res.data[0] if (user_res.data and len(user_res.data) > 0) else user_msg_data

        if canal_id == 1:
            return {"success": True, "user_message": inserted_user}
            
        elif canal_id in [2, 3]:
            is_group = (canal_id == 3)
            ai_text = await get_groq_ai_response(payload.message, is_group, payload.image_url)
            
            ai_msg_data = {
                "room_id": room_id,
                "sender_id": None,
                "sender_type": "AI",
                "message": ai_text,
                "metadata": {
                    "emisor": "AffiniCoach IA",
                    "fuente": "Groq API"
                },
                "created_at": datetime.utcnow().isoformat()
            }
            ai_res = supabase.table("chat_messages").insert(ai_msg_data).execute()
            inserted_ai = ai_res.data[0] if (ai_res.data and len(ai_res.data) > 0) else ai_msg_data
            
            return {"success": True, "user_message": inserted_user, "ai_response": inserted_ai}
        else:
            raise HTTPException(status_code=400, detail="canal_id inválido")
            
    except Exception as e:
        print(f"Error en endpoint chat: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))
