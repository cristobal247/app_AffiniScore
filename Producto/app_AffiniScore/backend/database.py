# Archivo creado para manejar la conexión a la base de datos Supabase

import os
from dotenv import load_dotenv
from supabase import create_client, Client

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