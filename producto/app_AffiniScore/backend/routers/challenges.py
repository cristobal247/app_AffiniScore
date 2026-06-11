from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
import json
import httpx
from database import supabase

router = APIRouter(prefix="/api/v1/challenges", tags=["challenges"])

class ChallengeValidateRequest(BaseModel):
    challenge_id: str
    challenge_title: str
    challenge_description: str
    points: int
    image_url: str
    user_id: str

@router.post("/validate")
async def validate_challenge_photo(request: ChallengeValidateRequest):
    groq_api_key = os.environ.get("GROQ_API_KEY", "")
    if not groq_api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY no encontrada en el entorno del servidor.")
    
    # 1. Obtener partnership_id
    partnership_id = None
    partner_id = None
    try:
        p_res = supabase.table("partnerships").select("*").or_(f"user1_id.eq.{request.user_id},user2_id.eq.{request.user_id}").eq("status", "active").execute()
        if p_res.data:
            partnership = p_res.data[0]
            partnership_id = partnership["id"]
            partner_id = partnership["user2_id"] if partnership["user1_id"] == request.user_id else partnership["user1_id"]
    except Exception as e:
        print(f"Error al buscar vinculación de pareja: {e}")

    # 2. Preparar el Prompt para la IA
    system_prompt = (
        "Eres AffiniCoach, una IA experta en analizar y validar retos de desconexión de parejas.\n"
        "Se te proporcionará una foto subida por la pareja como comprobante de que realizaron un reto específico.\n"
        "Debes realizar un análisis riguroso basado en tres aspectos esenciales:\n"
        "1. Presencia de la Pareja (Selfie): Deben aparecer dos personas en la foto (estilo selfie). Si no sale la pareja completa (menos de dos personas), se considera una falta grave y debes restar la mayoría de los puntos.\n"
        "2. Entorno y Ubicación: El entorno debe coincidir con el contexto y la descripción del reto. Si el reto indica una ubicación específica (ej. playa, parque, restaurante) pero la foto muestra claramente que están en otro lugar común como el sofá de la casa o la cocina, debes restar puntos por no estar en el lugar indicado.\n"
        "3. Emocionalidad (Sonrisas): Analiza la emoción de ambos. Deben verse sonrientes y felices. Si la pareja sale enojada, seria o triste, también debes restar puntos del total.\n\n"
        "Reglas de puntuación:\n"
        "- Comienzas con la puntuación máxima del reto (max_points).\n"
        "- Si no están ambos miembros de la pareja en la foto, resta el 80% o más de los puntos.\n"
        "- Si el entorno no coincide (ej. están en el sofá de la casa cuando debían estar en la playa), resta entre el 40% y 60% de los puntos.\n"
        "- Si no están sonriendo (están enojados, tristes o serios), resta entre el 20% y 40% de los puntos.\n"
        "- Los puntos otorgados no pueden ser menores que 0 ni mayores que max_points.\n\n"
        "Debes responder estrictamente en formato JSON con la siguiente estructura:\n"
        "{\n"
        "  \"points_awarded\": <int>,\n"
        "  \"smiling_score\": <float entre 0.0 y 1.0>,\n"
        "  \"environment_match\": <bool>,\n"
        "  \"feedback\": \"<Explicación detallada en español de lo observado, mencionando si están ambos, si el lugar corresponde y si se les ve sonriendo, explicando cualquier penalización de forma constructiva y cariñosa>\"\n"
        "}\n"
        "No incluyas ningún texto fuera del JSON, responde únicamente con el objeto JSON."
    )

    user_message = (
        f"Reto: '{request.challenge_title}'\n"
        f"Descripción: '{request.challenge_description}'\n"
        f"Puntos máximos: {request.points}"
    )

    # Download image and encode to base64 to avoid Groq fetching issues
    import base64
    image_base64 = ""
    media_type = "image/jpeg"
    try:
        async with httpx.AsyncClient() as client:
            img_resp = await client.get(request.image_url, timeout=10.0)
            img_resp.raise_for_status()
            image_base64 = base64.b64encode(img_resp.content).decode("utf-8")
            media_type = img_resp.headers.get("content-type", "image/jpeg")
    except Exception as download_err:
        print(f"Error downloading image for Groq: {download_err}")

    # Use base64 data URI if download succeeded, otherwise fall back to url
    image_url_payload = f"data:{media_type};base64,{image_base64}" if image_base64 else request.image_url

    user_content = [
        {"type": "text", "text": user_message},
        {"type": "image_url", "image_url": {"url": image_url_payload}}
    ]

    points_awarded = request.points
    smiling_score = 1.0
    environment_match = True
    feedback = "¡Buen trabajo completando el reto!"

    try:
        model = "llama-3.2-11b-vision-preview"
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
                    ],
                    "temperature": 0.2
                },
                timeout=18.0
            )
            response.raise_for_status()
            ai_data = response.json()
            ai_text = ai_data["choices"][0]["message"]["content"].strip()
            
            # Limpiar posibles bloques de código de markdown
            if ai_text.startswith("```"):
                lines = ai_text.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                ai_text = "\n".join(lines).strip()
            
            parsed = json.loads(ai_text)
            points_awarded = int(parsed.get("points_awarded", request.points))
            smiling_score = float(parsed.get("smiling_score", 1.0))
            environment_match = bool(parsed.get("environment_match", True))
            feedback = parsed.get("feedback", "Reto validado con éxito por AffiniCoach IA.")
    except Exception as e:
        print(f"Error llamando a Groq o procesando la respuesta: {e}")
        feedback = f"AffiniCoach IA validó tu reto de desconexión. Completado con éxito. (Nota: Hubo una degradación en el análisis visual, pero se te han asignado los puntos correspondientes)."

    # Asegurar límites de puntos
    points_awarded = max(0, min(request.points, points_awarded))

    # 3. Guardar puntos y registro
    try:
        # A) Registrar en memories
        memory_row = {
            "partnership_id": partnership_id,
            "user_id": request.user_id,
            "file_url": request.image_url,
            "file_name": request.image_url.split("/")[-1],
            "created_at": datetime.utcnow().isoformat(),
            "location_name": request.challenge_title,
            "title": f"Reto: {request.challenge_title}",
            "emotional_score": smiling_score
        }
        supabase.table("memories").insert(memory_row).execute()

        # B) Registrar en points_ledger
        ledger_row = {
            "partnership_id": partnership_id,
            "user_id": request.user_id,
            "points": points_awarded,
            "ai_validated": True,
            "created_at": datetime.utcnow().isoformat()
        }
        supabase.table("points_ledger").insert(ledger_row).execute()

        # C) Registrar o actualizar en user_actions_log
        existing_log = None
        try:
            log_res = supabase.table("user_actions_log").select("*").eq("partnership_id", partnership_id).eq("action_id", request.challenge_id).in_("status", ["PENDING", "ACTIVE"]).execute()
            if log_res.data:
                existing_log = log_res.data[0]
        except Exception as e:
            print(f"Error al buscar log existente: {e}")

        if existing_log:
            supabase.table("user_actions_log").update({
                "status": "CONFIRMED",
                "points_earned": points_awarded,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", existing_log["id"]).execute()
        else:
            action_log_row = {
                "user_id": request.user_id,
                "action_id": request.challenge_id,
                "points_earned": points_awarded,
                "status": "CONFIRMED",
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "partnership_id": partnership_id
            }
            supabase.table("user_actions_log").insert(action_log_row).execute()

        # D) Actualizar total_points en profiles
        profile_res = supabase.table("profiles").select("total_points").eq("id", request.user_id).execute()
        current_points = 0
        if profile_res.data:
            current_points = profile_res.data[0].get("total_points", 0) or 0
        
        supabase.table("profiles").update({
            "total_points": current_points + points_awarded,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", request.user_id).execute()

    except Exception as e:
        print(f"Error guardando registros en la base de datos: {e}")

    return {
        "success": True,
        "points_awarded": points_awarded,
        "max_points": request.points,
        "smiling_score": smiling_score,
        "environment_match": environment_match,
        "feedback": feedback
    }
