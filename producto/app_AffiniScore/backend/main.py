from fastapi import FastAPI, HTTPException
from database import supabase
from pydantic import BaseModel
import random
import string

from fastapi.middleware.cors import CORSMiddleware
from models.points import PointRequestCreate


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers.chat import router as chat_router
app.include_router(chat_router)

# Modelo solo para cuando el Usuario A invita
class InviteRequest(BaseModel):
    user1_id: str

# Modelo solo para cuando el Usuario B se une
class JoinRequest(BaseModel):
    token: str
    user2_id: str

class UnlinkRequest(BaseModel):
    user_id: str

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
        print(f"DEBUG: Attempting to join with token: {request.token} and user2_id: {request.user2_id}")
        # Aquí verificamos que el token exista y el status sea pending
        response = supabase.table("partnerships").update({
            "user2_id": request.user2_id,
            "status": "active"
        }).eq("pairing_token", request.token).eq("status", "pending").execute()
        
        if not response.data:
            print(f"DEBUG: No data returned from partnerships update. Token might be invalid, already used, or not pending. Token: {request.token}")
            raise HTTPException(status_code=400, detail="Token no válido o ya utilizado")
            
        partnership = response.data[0]
        print(f"DEBUG: Partnership record updated successfully: {partnership}")
        
        partnership_id = partnership["id"]
        user1_id = partnership["user1_id"]
        user2_id = partnership["user2_id"]
        
        try:
            # Actualizar los perfiles de ambos usuarios con el ID de la vinculación
            print(f"DEBUG: Updating profile for user1: {user1_id}")
            res1 = supabase.table("profiles").update({"partnership_id": partnership_id}).eq("id", user1_id).execute()
            print(f"DEBUG: User1 profile update response: {res1.data}")
            
            print(f"DEBUG: Updating profile for user2: {user2_id}")
            res2 = supabase.table("profiles").update({"partnership_id": partnership_id}).eq("id", user2_id).execute()
            print(f"DEBUG: User2 profile update response: {res2.data}")
        except Exception as profile_err:
            print(f"DEBUG: Error updating profiles: {str(profile_err)}")
            # No lanzamos excepción aquí para que al menos la vinculación quede guardada, 
            # pero el log nos dirá si esto falló.
            
        return {"message": "Vinculación exitosa"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"DEBUG: Unexpected error in join_partnership: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/partnerships/unlink")
async def unlink_partnership(request: UnlinkRequest):
    try:
        # Buscar la vinculación activa
        p1 = supabase.table("partnerships").select("*").eq("user1_id", request.user_id).eq("status", "active").execute()
        p2 = supabase.table("partnerships").select("*").eq("user2_id", request.user_id).eq("status", "active").execute()
        
        partnership = None
        if p1.data: partnership = p1.data[0]
        elif p2.data: partnership = p2.data[0]
        
        if not partnership:
            raise HTTPException(status_code=400, detail="No tienes una pareja vinculada")
            
        # Actualizar status a unlinked
        supabase.table("partnerships").update({"status": "unlinked"}).eq("id", partnership["id"]).execute()
        
        # Anular partnership_id en los perfiles de ambos usuarios
        supabase.table("profiles").update({"partnership_id": None}).eq("id", partnership["user1_id"]).execute()
        supabase.table("profiles").update({"partnership_id": None}).eq("id", partnership["user2_id"]).execute()
        
        return {"message": "Desvinculación exitosa"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/v1/points/request")
async def create_point_request(request: PointRequestCreate):
    try:
        # Insertamos en la tabla de Supabase que creamos recién
        response = supabase.table("pending_points").insert({
            "sender_id": request.sender_id,
            "receiver_id": request.receiver_id,
            "activity_name": request.activity_name,
            "points_value": request.points_value,
            "status": "pending" # Siempre nace como pendiente
        }).execute()
        
        return {"status": "success", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))        