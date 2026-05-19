from fastapi import APIRouter, HTTPException, Path, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
import httpx
import random
from database import supabase

router = APIRouter()

class ChatMessagePayload(BaseModel):
    message: str
    image_url: Optional[str] = None
    sender_id: Optional[str] = None

def get_fallback_therapist_response(user_message: str, is_group: bool) -> str:
    msg = user_message.lower()
    
    # 1. Temáticas de tristeza / enojo / conflicto
    if any(word in msg for word in ["triste", "mal", "pelea", "discusión", "enojado", "molesto", "distante", "frío", "separados", "celos", "llorar"]):
        responses = [
            "Lamento mucho que estén pasando por un momento difícil. Es completamente natural que surjan tensiones en la pareja. Como su AffiniCoach, les sugiero que respiren profundo y traten de expresar sus sentimientos desde la empatía, usando frases como 'Yo me siento...' en lugar de culpar. ¿Les gustaría compartir qué detonó este sentimiento?",
            "Entiendo el dolor o la frustración en tus palabras. Los desacuerdos son oportunidades ocultas para reconstruir la complicidad. Invito a ambos a escucharse sin interrumpir por 2 minutos. ¿Qué sienten que necesita el otro en este preciso momento?",
            "Es valioso que expreses esto aquí. Cuando nos sentimos distantes, el primer paso es reconocerlo juntos sin juzgar. ¿Qué pequeño gesto de afecto o validación creen que podría aliviar la tensión hoy?"
        ]
        return random.choice(responses)
        
    # 2. Temáticas positivas / amor / felicidad
    elif any(word in msg for word in ["feliz", "bien", "contento", "alegre", "te amo", "gracias", "lindo", "amor", "disfrutando", "gustó", "bello", "hermoso"]):
        responses = [
            "¡Qué alegría me da leer esto! Celebrar los momentos de conexión, gratitud y complicidad es el alimento diario de una relación saludable y fuerte. Sigan compartiendo estos sentimientos tan hermosos.",
            "Me encanta ver esta energía tan positiva entre ustedes. Validar el afecto públicamente fortalece enormemente el vínculo emocional. ¿Qué es lo que más valoran de este momento juntos?",
            "¡Excelente! Momentos como este son los que construyen una base sólida para el futuro. Les animo a seguir cultivando estos instantes de felicidad."
        ]
        return random.choice(responses)
        
    # 3. Temáticas de intimidad física
    elif any(word in msg for word in ["sexo", "intimidad", "cama", "abrazo", "beso", "pasión", "deseo", "dormir"]):
        responses = [
            "La intimidad física y emocional están profundamente conectadas. Hablar abiertamente de sus deseos, límites y necesidades con ternura y sin presiones es clave para mantener viva la chispa. ¿Cómo se sienten respecto a su nivel de conexión íntima actual?",
            "El contacto físico (los abrazos de 20 segundos, los besos sinceros) libera oxitocina y reduce el estrés de inmediato. Les sugiero planear un momento exclusivo para conectar a solas esta semana."
        ]
        return random.choice(responses)

    # 4. Solicitud de ayuda / consejos / ejercicios
    elif any(word in msg for word in ["ayuda", "consejo", "guía", "cómo", "hacer", "ejercicio", "actividad"]):
        responses = [
            "Como su AffiniCoach, mi mejor consejo hoy es practicar la 'pausa consciente'. Antes de reaccionar a algo que diga tu pareja, detente, respira y pregúntate: '¿Cómo puedo responder con amor en lugar de defensa?'. ¿Les gustaría probar este ejercicio?",
            "Para fortalecer la relación, les recomiendo establecer un 'ritual de apreciación diario': al final del día, compartan una pequeña cosa que agradezcan del otro. Ayuda muchísimo a cambiar el foco hacia lo positivo."
        ]
        return random.choice(responses)

    # 5. Respuestas terapéuticas profesionales genéricas
    generic_responses = [
        "Gracias por compartir eso. Como su terapeuta de parejas AffiniCoach, veo mucha valentía en abrir estos canales de comunicación. ¿Qué opina tu pareja sobre esto que acabas de mencionar? Me encantaría escuchar la perspectiva de ambos.",
        "Es una reflexión sumamente interesante. La comunicación abierta y honesta es la base de todo crecimiento mutuo. ¿Cómo se sienten ambos respecto a este tema en su vida cotidiana?",
        "Entendido. A veces, poner en palabras lo que pensamos nos ayuda a procesarlo mejor. Para profundizar un poco, ¿podrían intentar expresar cómo les afecta esta situación individualmente a cada uno?",
        "Eso es muy valioso. Les propongo un pequeño ejercicio: que cada uno resuma lo que entendió de la intervención del otro antes de dar su propia opinión. Esto asegura que ambos se sientan verdaderamente escuchados."
    ]
    return random.choice(generic_responses)

async def get_groq_ai_response(user_message: str, is_group: bool) -> tuple[str, bool]:
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_api_key:
        print("GROQ_API_KEY no encontrada en entorno, usando fallback terapéutico inteligente offline.")
        return get_fallback_therapist_response(user_message, is_group), True
        
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

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message}
                    ]
                },
                timeout=12.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"], False
    except Exception as e:
        print(f"Error comunicándose con Groq: {e}. Usando fallback terapéutico inteligente offline.")
        return get_fallback_therapist_response(user_message, is_group), True

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
        user_msg_data = {
            "room_id": str(partnership_id),
            "sender_id": id_usuario,
            "sender_type": "USER",
            "message": payload.message,
            "metadata": {"emisor": emisor_name, "canal": 3},
            "created_at": datetime.utcnow().isoformat()
        }
        user_res = supabase.table("chat_messages").insert(user_msg_data).execute()
        inserted_user = user_res.data[0] if (user_res.data and len(user_res.data) > 0) else user_msg_data
        
        # 3. Obtener respuesta de la IA configurada como moderadora grupal
        ai_text, was_fallback = await get_groq_ai_response(payload.message, is_group=True)
        
        # 4. Guardar respuesta de la IA
        ai_msg_data = {
            "room_id": str(partnership_id),
            "sender_id": None,
            "sender_type": "AI",
            "message": ai_text,
            "metadata": {
                "emisor": "AffiniCoach IA", 
                "canal": 3,
                "fuente": "Fallback Local" if was_fallback else "Groq Llama 3.3"
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
            ai_text, was_fallback = await get_groq_ai_response(payload.message, is_group)
            
            ai_msg_data = {
                "room_id": room_id,
                "sender_id": None,
                "sender_type": "AI",
                "message": ai_text,
                "metadata": {
                    "emisor": "AffiniCoach IA",
                    "fuente": "Fallback Local" if was_fallback else "Groq Llama 3.3"
                },
                "created_at": datetime.utcnow().isoformat()
            }
            ai_res = supabase.table("chat_messages").insert(ai_msg_data).execute()
            inserted_ai = ai_res.data[0] if (ai_res.data and len(ai_res.data) > 0) else ai_msg_data
            
            return {"success": True, "user_message": inserted_user, "ai_response": inserted_ai}
        else:
            raise HTTPException(status_code=400, detail="canal_id inválido")
            
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
