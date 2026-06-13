from fastapi import APIRouter, HTTPException, Path, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
import httpx
import base64
from database import supabase
from google import genai
from google.genai import types

router = APIRouter()

class ChatMessagePayload(BaseModel):
    message: str
    image_url: Optional[str] = None
    sender_id: Optional[str] = None
    session_id: Optional[str] = None

async def get_gemini_ai_response(user_message: str, is_group: bool, image_url: Optional[str] = None, history: Optional[list] = None, emisor_name: Optional[str] = None) -> str:
    gemini_api_key = os.environ.get("GEMINI_API_KEY", "")
    if not gemini_api_key:
        gemini_api_key = os.environ.get("GROQ_API_KEY", "")
        if not gemini_api_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY no encontrada en el entorno del servidor.")
        
    model = "gemini-2.5-flash"

    base_prompt = (
        "Eres AffiniCoach, un terapeuta de parejas de élite con más de 15 años de experiencia clínica. "
        "Te especializas en relaciones de pareja, comunicación asertiva y resolución de conflictos utilizando marcos probados "
        "como el Método Gottman (fomentar la amistad, manejar el conflicto, crear sentido compartido), "
        "la Terapia Focalizada en las Emociones (TFE) y la Comunicación No Violenta (CNV).\n\n"
        
        "TUS DIRECTRICES DE COMPORTAMIENTO:\n"
        "1. TONO: Cálido, empático, altamente profesional, analítico e inteligente. Habla como un psicólogo real de verdad.\n"
        "2. CONVERSACIÓN FLUIDA (EVITA DAR CONSEJOS Y TERMINAR): No des consejos definitivos de inmediato ni termines la sesión rápido. "
        "Escucha activamente, valida emocionalmente y haz **preguntas reflexivas y abiertas** para indagar y comprender el fondo. "
        "Tu meta es simular una sesión de terapia real, manteniendo un diálogo fluido a lo largo de varios mensajes (ida y vuelta).\n"
        "3. FORMATO VISUAL: Para facilitar la comprensión en celulares, **resalta frases o palabras clave en negrita** (usando **texto**). "
        "Usa emojis apropiados (ej. 💖, 🤝, 💬, 🧘) de forma moderada, nunca en exceso, para mantener un aire premium pero cercano.\n"
        "4. SIN FAVORITISMOS: En el chat grupal, mantén una neutralidad absoluta. Jamás tomes partido por ninguno de los dos. "
        "Si uno de los dos expresa una queja, valida su emoción, pero invita al otro a expresarse con empatía.\n"
        "5. LENGUAJE EMOCIONAL: Ayuda a la pareja a traducir la culpa ('tú siempre haces...', 'por tu culpa...') "
        "en expresiones de vulnerabilidad e impacto personal ('me siento solo/a cuando...', 'necesito apoyo en...').\n"
        "6. FORMATO MÓVIL: Respuestas concisas que quepan en burbujas de chat. Escribe un máximo de 2 a 3 párrafos cortos (no más de 2 oraciones por párrafo).\n"
        "7. IDIOMA: Responde siempre en un español natural, cálido y comprensible."
    )

    if is_group:
        system_prompt = (
            f"{base_prompt}\n\n"
            "CONTEXTO ACTUAL: Chat Grupal de Pareja. Estás interactuando con ambos miembros a la vez. "
            "Cada mensaje de los usuarios vendrá precedido por su nombre entre corchetes, por ejemplo: '[Juan]: mi pareja me ignora'.\n"
            "INSTRUCCIONES CLAVE DE GRUPO:\n"
            "- Identifica quién está hablando gracias a la etiqueta de su nombre.\n"
            "- Cuando un usuario exprese una preocupación, dolor o queja (ej. 'mi pareja me ignora'), valida sus sentimientos con empatía.\n"
            "- Inmediatamente después, dirígete al otro miembro de la pareja por su nombre (si está en el historial reciente o si lo puedes deducir) y pídele amablemente su perspectiva u opinión al respecto para involucrarlo en la terapia. Ejemplo: '[Valida al emisor]... y cuéntame [Nombre de la pareja], ¿cómo vives tú esta situación?' o '¿qué opinas sobre esto que nos comparte [Nombre]?'\n"
            "- Mantén el hilo de la conversación y no desvíes el tema. Fomenta que hablen y se escuchen mutuamente sin tomar bandos."
        )
    else:
        system_prompt = (
            f"{base_prompt}\n\n"
            "CONTEXTO ACTUAL: Sesión Individual. El usuario está hablando contigo en privado. "
            "Bríndale un espacio seguro de desahogo y autorreflexión, pero siempre ayúdale a enfocar cómo "
            "puede aportar de manera constructiva a la relación y entender la perspectiva de su pareja."
        )

    # Preparar el contenido para Gemini con historial de conversación
    contents = []
    
    if history:
        for msg in history:
            role = "user" if msg.get("sender_type") == "USER" else "model"
            msg_text = msg.get("message") or ""
            metadata = msg.get("metadata") or {}
            msg_image_url = metadata.get("image_url")
            
            # Si es chat grupal, agregamos el nombre del emisor al inicio del mensaje del historial
            if role == "user" and is_group:
                emisor = metadata.get("emisor") or "Usuario"
                msg_text = f"[{emisor}]: {msg_text}"
                
            parts = [types.Part.from_text(text=msg_text)]
            if msg_image_url and role == "user":
                if msg_image_url.startswith("data:"):
                    try:
                        header, encoded = msg_image_url.split(",", 1)
                        mtype = header.split(";")[0].split(":")[1]
                        img_data = base64.b64decode(encoded)
                        parts.append(types.Part.from_bytes(data=img_data, mime_type=mtype))
                    except Exception as e:
                        print(f"Error decodificando imagen base64 del historial: {e}")
                
            contents.append(types.Content(role=role, parts=parts))

    # Verificar si el último mensaje del historial ya contiene el mensaje que se va a enviar
    has_current = False
    expected_text = f"[{emisor_name}]: {user_message}" if (is_group and emisor_name) else user_message
    if contents and contents[-1].role == "user":
        last_text = contents[-1].parts[0].text or ""
        if last_text == expected_text or last_text == user_message:
            has_current = True
            
    if not has_current:
        # Añadir mensaje actual
        parts = [types.Part.from_text(text=expected_text)]
        if image_url:
            if image_url.startswith("data:"):
                try:
                    header, encoded = image_url.split(",", 1)
                    mime_type = header.split(";")[0].split(":")[1]
                    img_data = base64.b64decode(encoded)
                    parts.append(types.Part.from_bytes(data=img_data, mime_type=mime_type))
                except Exception as e:
                    print(f"Error decodificando imagen base64 actual: {e}")
            else:
                try:
                    async with httpx.AsyncClient() as client:
                        img_resp = await client.get(image_url, timeout=10.0)
                        img_resp.raise_for_status()
                        mime_type = img_resp.headers.get("content-type", "image/jpeg")
                        parts.append(types.Part.from_bytes(data=img_resp.content, mime_type=mime_type))
                except Exception as download_err:
                    print(f"Error descargando imagen actual: {download_err}")
        contents.append(types.Content(role="user", parts=parts))

    try:
        client = genai.Client(api_key=gemini_api_key)
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.7
            )
        )
        return response.text
    except Exception as e:
        print(f"Error llamando a la API de Gemini: {e}")
        raise HTTPException(status_code=502, detail=f"Error al conectar con el servicio de IA (Gemini): {str(e)}")

@router.post("/api/chat/3/{id_usuario}")
async def process_group_chat_3_message(
    payload: ChatMessagePayload,
    id_usuario: str = Path(..., description="ID del usuario emisor")
):
    try:
        p_res = supabase.table("partnerships").select("id").or_(f"user1_id.eq.{id_usuario},user2_id.eq.{id_usuario}").eq("status", "active").execute()
        
        if not p_res.data:
            raise HTTPException(status_code=400, detail="El usuario no tiene una pareja vinculada activa")
            
        partnership_id = p_res.data[0]["id"]

        room_check = supabase.table("chat_rooms").select("id").eq("id", partnership_id).execute()
        if not room_check.data:
            new_room = {
                "id": str(partnership_id),
                "partnership_id": str(partnership_id),
                "room_type": "GROUP_AI",
                "title": "Terapia Grupal"
            }
            supabase.table("chat_rooms").insert(new_room).execute()

        profile_res = supabase.table("profiles").select("full_name").eq("id", id_usuario).execute()
        emisor_name = profile_res.data[0].get("full_name", "Usuario") if profile_res.data else "Usuario"
        
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
        
        # 3. Obtener el historial reciente del chat grupal (últimos 8 mensajes)
        history = []
        try:
            h_res = supabase.table("chat_messages").select("sender_type, message, metadata").eq("room_id", str(partnership_id)).order("created_at", desc=True).limit(8).execute()
            if h_res.data:
                history = list(reversed(h_res.data))
        except Exception as he:
            print(f"Error cargando historial de chat grupal: {he}")

        # 4. Obtener respuesta de la IA configurada como moderadora grupal
        ai_text = await get_gemini_ai_response(payload.message, is_group=True, image_url=payload.image_url, history=history, emisor_name=emisor_name)
        
        # 5. Guardar respuesta de la IA
        ai_msg_data = {
            "room_id": str(partnership_id),
            "sender_id": None,
            "sender_type": "AI",
            "message": ai_text,
            "metadata": {
                "emisor": "AffiniCoach IA", 
                "canal": 3,
                "fuente": "Gemini API"
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
            
            # Obtener el historial de la conversación (últimos 8 mensajes)
            history = []
            try:
                h_res = supabase.table("chat_messages").select("sender_type, message, metadata").eq("room_id", room_id).order("created_at", desc=True).limit(8).execute()
                if h_res.data:
                    history = list(reversed(h_res.data))
            except Exception as he:
                print(f"Error cargando historial de chat: {he}")

            ai_text = await get_gemini_ai_response(payload.message, is_group, payload.image_url, history=history, emisor_name=emisor)
            
            ai_msg_data = {
                "room_id": room_id,
                "sender_id": None,
                "sender_type": "AI",
                "message": ai_text,
                "metadata": {
                    "emisor": "AffiniCoach IA",
                    "fuente": "Gemini API"
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
