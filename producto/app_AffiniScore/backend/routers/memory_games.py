from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import random

from database import supabase

router = APIRouter(prefix="/api/v1/memory-games", tags=["memory-games"])


class HistoricMemoryRequest(BaseModel):
    partnership_id: str
    user_id: str
    round_key: Optional[str] = None


class HistoricMemoryCompleteRequest(BaseModel):
    partnership_id: str
    user_id: str
    memory_id: str


def _get_active_partnership(partnership_id: str, user_id: str):
    partnership_res = (
        supabase.table("partnerships")
        .select("id,user1_id,user2_id,status")
        .eq("id", partnership_id)
        .eq("status", "active")
        .execute()
    )

    if not partnership_res.data:
        raise HTTPException(status_code=404, detail="No existe una pareja activa para este juego")

    partnership = partnership_res.data[0]
    allowed_users = {partnership.get("user1_id"), partnership.get("user2_id")}
    if user_id not in allowed_users:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta partida")

    return partnership


def _normalize_memory(row: dict) -> dict:
    image_url = row.get("file_url") or row.get("public_url") or row.get("image_url") or row.get("url") or ""
    return {
        "id": row.get("id") or row.get("file_name") or image_url,
        "image_url": image_url,
        "location_name": row.get("location_name"),
        "created_at": row.get("created_at"),
        "emotional_score": row.get("emotional_score"),
        "partnership_id": row.get("partnership_id"),
        "user_id": row.get("user_id"),
        "file_name": row.get("file_name"),
    }


@router.post("/round")
async def get_historic_memory_round(request: HistoricMemoryRequest):
    partnership = _get_active_partnership(request.partnership_id, request.user_id)
    partner_ids = {partnership.get("user1_id"), partnership.get("user2_id")}

    memories_res = supabase.table("memories").select("*").execute()
    all_memories = memories_res.data or []

    candidates = []
    for row in all_memories:
        if row.get("partnership_id") == partnership["id"] or row.get("user_id") in partner_ids:
            normalized = _normalize_memory(row)
            if normalized["image_url"]:
                candidates.append(normalized)

    if not candidates:
        raise HTTPException(
            status_code=404,
            detail="No hay recuerdos disponibles en la galería para esta pareja"
        )

    now = datetime.utcnow()
    round_key = request.round_key or f"{now.strftime('%Y%m%d%H')}-{now.minute // 5}"
    rng = random.Random(f"{partnership['id']}::{round_key}")
    selected = rng.choice(candidates)

    return {
        "partnership_id": partnership["id"],
        "round_key": round_key,
        "started_at": now.isoformat(),
        "memory": selected,
        "count": len(candidates),
    }


@router.post("/complete")
async def complete_historic_memory(request: HistoricMemoryCompleteRequest):
    partnership = _get_active_partnership(request.partnership_id, request.user_id)
    points_to_award = 20

    ledger_row = {
        "partnership_id": partnership["id"],
        "user_id": request.user_id,
        "points": points_to_award,
        "ai_validated": False,
        "created_at": datetime.utcnow().isoformat(),
    }

    ledger_res = supabase.table("points_ledger").insert(ledger_row).execute()
    if getattr(ledger_res, "error", None):
        raise HTTPException(status_code=400, detail=str(ledger_res.error))

    profile_res = (
        supabase.table("profiles")
        .select("total_points")
        .eq("id", request.user_id)
        .execute()
    )
    current_points = 0
    if profile_res.data:
        current_points = profile_res.data[0].get("total_points", 0) or 0

    update_res = (
        supabase.table("profiles")
        .update({
            "total_points": current_points + points_to_award,
            "updated_at": datetime.utcnow().isoformat(),
        })
        .eq("id", request.user_id)
        .execute()
    )
    if getattr(update_res, "error", None):
        raise HTTPException(status_code=400, detail=str(update_res.error))

    return {
        "success": True,
        "points_awarded": points_to_award,
        "partnership_id": partnership["id"],
        "memory_id": request.memory_id,
    }