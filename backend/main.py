from fastapi import FastAPI, HTTPException
from database import supabase
from pydantic import BaseModel
import random
import string

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelo solo para cuando el Usuario A invita
class InviteRequest(BaseModel):
    user1_id: str

# Modelo solo para cuando el Usuario B se une
class JoinRequest(BaseModel):
    token: str
    user2_id: str

@app.post("/api/v1/partnerships/invite")
async def create_partnership(request: InviteRequest):
    # Generar token aquí
    token = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    try:
        # Verificar si el usuario ya tiene una invitación generada
        existing = supabase.table("partnerships").select("*").eq("user1_id", request.user1_id).execute()
        
        if existing.data:
            # Si ya existe, actualizamos el token
            response = supabase.table("partnerships").update({
                "pairing_token": token,
                "status": "pending"
            }).eq("user1_id", request.user1_id).execute()
        else:
            # Si no existe, creamos una nueva
            response = supabase.table("partnerships").insert({
                "user1_id": request.user1_id,
                "pairing_token": token,
                "status": "pending"
            }).execute()
            
        return {"message": "Invitación creada", "token": token}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/partnerships/join")
async def join_partnership(request: JoinRequest):
    try:
        # Aquí verificamos que el token exista y el status sea pending
        response = supabase.table("partnerships").update({
            "user2_id": request.user2_id,
            "status": "active"
        }).eq("pairing_token", request.token).eq("status", "pending").execute()
        
        if not response.data:
            raise HTTPException(status_code=400, detail="Token no válido")
            
        return {"message": "Vinculación exitosa"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))