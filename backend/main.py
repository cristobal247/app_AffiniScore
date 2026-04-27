from fastapi import FastAPI, HTTPException
from database import supabase
from pydantic import BaseModel
import random
import string

app = FastAPI()

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