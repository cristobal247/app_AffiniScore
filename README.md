# AffiniScore 💖
**Sistema Inteligente de Gamificación y Fortalecimiento Relacional**

Aplicación móvil para la reconexión de parejas mediante incentivos y asistencia de Inteligencia Artificial [6, 7].

`Ionic` `Angular` `FastAPI` `Supabase` `Mapbox` `Gemini IA`

---

## Tabla de Contenidos
- [Descripción](#descripción)
- [Características principales](#características-principales)
- [Stack Tecnológico](#stack-tecnológico)
- [Requisitos del sistema](#requisitos-del-sistema)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Variables de entorno](#variables-de-entorno)
- [Estructura del proyecto (Auditoría Duoc UC)](#estructura-del-proyecto)
- [Guía de uso](#guía-de-uso)
- [Endpoints API](#endpoints-api)
- [Guía de desarrollo y contribución](#guía-de-desarrollo)
- [Notas adicionales](#notas-adicionales)

---

## Descripción
AffiniScore es una solución móvil diseñada estratégicamente para parejas adultas (mayores de 30 años) que buscan combatir la desconexión física y emocional causada por la rutina diaria y la hiperconexión digital [4, 6, 8]. A través de un ecosistema seguro, la aplicación fomenta el tiempo de calidad mediante la gamificación de "Actos de Servicio", validación de recuerdos a través de IA, y la asistencia empática del Terapeuta IA "Sinclair" [4, 9-11].

---

## Características principales

### 1. Sistema de Affini Points y Gamificación
- **Registro de Acciones de Servicio:** Botones rápidos para registrar gestos cotidianos [4].
- **Tienda de Recompensas:** Canje de puntos por permisos o premios en la vida real [4].
- **Retos de Desconexión:** Desafíos para realizar actividades sin pantallas [4].
- **Juego de Memoria Histórica:** Interacciones rápidas basadas en recordar fotografías conjuntas pasadas [12].

### 2. Inteligencia Artificial y Validación (Sinclair)
- **Validación Multimedia:** Carga de fotos de citas; la IA analiza la emocionalidad para asignar Affini Points automáticamente [9].
- **Terapeuta IA:** Chat individual y grupal con la IA para resolver conflictos y recibir sugerencias empáticas [10, 13].

### 3. Mapa, Conciencia Espacial y Privacidad
- **Tiempo de Calidad (Geofencing):** La app detecta cuando ambos celulares están a menos de 50 metros y sugiere actividades [14].
- **Botón S.O.S (Pánico):** Envío de ubicación exacta y 5 segundos de audio en emergencias [13, 14].
- **Dashboard y Reportería:** Exportación del Reporte de Salud Relacional en formato PDF [14].

---

## Stack Tecnológico

| Componente | Tecnología |
| :--- | :--- |
| **Framework Frontend** | Ionic + Angular (Multiplataforma iOS/Android) [5, 15] |
| **Backend API** | FastAPI + Python (Uvicorn / Pydantic) [16, 17] |
| **Base de Datos / BaaS** | Supabase (PostgreSQL) [16, 18, 19] |
| **Autenticación** | Supabase Auth (JWT + RLS) [18] |
| **Mapas / Geolocalización**| Mapbox API (Geofencing) |
| **Inteligencia Artificial** | Gemini / Google AI Studio (Provisorio) -> API Triskeledu |

---

## Requisitos del sistema

### Dispositivo Móvil (Cliente)
- iOS 13.0+ o Android 8.0+
- Conectividad a Internet (3G/4G/5G o WiFi) para sincronización en tiempo real.

### Permisos Requeridos
- **Ubicación (GPS):** Para funciones de Geofencing y Botón S.O.S [13, 14].
- **Cámara/Galería:** Para carga de fotos en retos de desconexión [9].
- **Micrófono:** Para grabaciones de emergencia (S.O.S) [14].

---

## Instalación y ejecución

### Prerrequisitos
```bash
npm install -g @ionic/cli @angular/cli
pip install virtualenv
Clonar el repositorio
git clone https://github.com/TuUsuario/AffiniScore.git
cd AffiniScore
1. Iniciar Backend (FastAPI)
cd Producto/backend
python -m venv venv
# Activar entorno: venv\Scripts\activate (Windows) o source venv/bin/activate (Mac/Linux)
pip install -r requirements.txt
uvicorn main:app --reload
2. Iniciar Frontend (Ionic/Angular)
cd Producto/frontend
npm install
ionic serve

--------------------------------------------------------------------------------
Variables de entorno
Frontend (src/environments/environment.ts):
export const environment = {
  production: false,
  supabaseUrl: 'TU_SUPABASE_URL',
  supabaseKey: 'TU_SUPABASE_ANON_KEY',
  mapbox: { accessToken: 'TU_MAPBOX_TOKEN' }
};
Backend (Producto/backend/.env):
SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_KEY=tu_service_role_key
GEMINI_API_KEY=tu_token_google_ai_studio

--------------------------------------------------------------------------------
Estructura del proyecto (Auditoría Duoc UC)
Este repositorio cumple con la normativa exigida por la coordinación de TPY1101
.
AffiniScore/
├── 📁 Gestión/                # Documentos administrativos [21].
│   ├── 1.1.2_Documento_de_registro.docx
│   └── Integrantes.txt
├── 📁 Documentación/          # Diseño, arquitectura y QA [22].
│   ├── Informes_de_Avance/
│   ├── Diagramas_UML_y_MER/
│   ├── Plan_de_Pruebas_y_QA/
│   └── Carta_Gantt/
└── 📁 Producto/               # Entregables técnicos [3].
    ├── backend/               # API en FastAPI
    ├── frontend/              # Aplicación móvil en Ionic
    └── scripts_bd/            # Scripts SQL (Creación de tablas y poblado de prueba)


--------------------------------------------------------------------------------
Guía de uso
Registro y Vinculación: Los usuarios crean su cuenta y sincronizan sus perfiles mediante un token único o código QR generado por la app
.
Acciones Diarias: Un usuario registra una "Acción de Servicio" (ej. Preparar el desayuno). El compañero la valida para sumar Affini Points
.
Retos y Validación IA: Realizan un reto de desconexión, suben una fotografía y la IA analiza la imagen para otorgar bonificaciones
.
Asistencia: Utilizan el chat privado o consultan a "Sinclair" (Terapeuta IA) para mejorar la comunicación
.

--------------------------------------------------------------------------------
Endpoints API (FastAPI)
URL Base Local: http://127.0.0.1:8000
Endpoint
Método
Descripción
/api/v1/partnerships/invite
POST
Genera token de invitación (6 dígitos)
.
/api/v1/partnerships/join
POST
Une a la pareja mediante el token e inicia la relación
.
/api/chat/{id_canal}/{usuario}
POST
Envía mensaje al chat (1: Pareja, 2: Individual con IA, 3: Grupal con IA). Guarda historial en DB.
/api/v1/activities/catalog
GET
Retorna el catálogo de retos y acciones de servicio
.
/api/v1/user_profiles
GET
Retorna datos del usuario autenticado (JWT)
.

--------------------------------------------------------------------------------
Estándares y Notas Adicionales
Proyecto desarrollado como parte de la asignatura Taller Aplicado de Programación (TPY1101) en DUOC UC
.
Vinculación con el Medio: Proyecto codesarñado para el cliente Academia Tecnológica Triskeledu bajo el modelo CREA+
.
Calidad del Código: El proyecto utiliza ESLint/Prettier (Frontend) y PEP8 (Backend). Todo código en main debe superar las pruebas documentadas en la carpeta de Documentación/QA.
