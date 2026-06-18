# Archivo creado para manejar la conexión a la base de datos Supabase

import os
from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi import HTTPException
from urllib.parse import urlparse

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
# Esta es la instancia que usarás para hablar con la BD
supabase: Client | None = None
try:
	if not url or not key:
		raise ValueError('SUPABASE_URL or SUPABASE_KEY not set')
	supabase = create_client(url, key)
except Exception as e:
	# No detener el arranque del servidor: arrancamos en modo degradado
	print(f"Warning: Supabase client not initialized: {e}")
	supabase = None

def get_user_id_from_token(authorization: str | None) -> str:
	if not supabase:
		raise HTTPException(status_code=503, detail="Servicio de base de datos no disponible")
	if not authorization or not authorization.lower().startswith("bearer "):
		raise HTTPException(status_code=401, detail="Token de autorización faltante o inválido")
	
	token = authorization.split(" ", 1)[1].strip()
	try:
		user_res = supabase.auth.get_user(token)
		if not user_res or not user_res.user:
			raise HTTPException(status_code=401, detail="Usuario no encontrado o sesión expirada")
		return user_res.user.id
	except Exception as e:
		raise HTTPException(status_code=401, detail=f"Token inválido o expirado: {str(e)}")

def is_safe_url(url_str: str, allowed_base_url: str) -> bool:
	if not url_str or not allowed_base_url:
		return False
	try:
		parsed_url = urlparse(url_str)
		parsed_base = urlparse(allowed_base_url)
		
		if parsed_url.scheme not in ('http', 'https'):
			return False
		
		if parsed_url.netloc != parsed_base.netloc:
			return False
			
		return True
	except Exception:
		return False