# Archivo creado para manejar la conexión a la base de datos Supabase

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

# Esta es la instancia que usarás para hablar con la BD
supabase: Client = create_client(url, key)