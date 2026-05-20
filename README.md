# 💖 AffiniScore

## 📖 Información Base del Proyecto
**AffiniScore** es una aplicación móvil nativa diseñada para fortalecer la relación de parejas adultas (mayores de 30 años) afectada por la rutina y la hiperconexión. La plataforma se basa principalmente en un **sistema de puntajes (Affini Points)** que incentiva y gamifica las interacciones positivas a través del registro de "actos de servicio" y "retos de desconexión". 
Además, integra un "Terapeuta de Pareja IA" como mediador, una bandeja de comunicación con distintos niveles de privacidad, herramientas de conciencia espacial (geofencing) y seguridad (S.O.S).

* **Cliente:** Cristián Gómez (Academia Tecnológica Triskeledu).
* **Metodología:** Aprendizaje Basado en Problemas (ABP) / Scrum.

## 👥 Equipo de Desarrollo
* **Belén Toloza:** Jefa de Proyecto y Analista Programador.
* **Ignacio Álvarez:** Analista de Base de Datos y Analista QA.
* **Cristóbal Paredes:** Analista de Base de Datos y Analista Programador.

## 🛠️ Tecnologías Utilizadas
* **Frontend:** Ionic Framework y Angular (Aplicación Móvil).
* **Backend (Intermedio y WebSockets):** FastAPI (Python) para la gestión de la bandeja de chats en tiempo real y la orquestación de la IA.
* **Backend y Base de Datos:** Supabase (Almacenamiento y sincronización).
* **Geolocalización:** API de Mapbox.
* **Inteligencia Artificial:** Gemini / Google AI Studio (Procesamiento de Terapeuta IA, análisis de interacciones y validación de puntos).

## 📁 Estructura del Repositorio (Control de Auditoría)
Para dar cumplimiento a las normativas de auditoría, este repositorio se divide en tres directorios:
1. **`/Gestión`**: Actas de reunión, documento de identificación del proyecto (Guía 1) y conformación del equipo (`Integrantes.txt`).
2. **`/Documentación`**: Carta Gantt, diagramas técnicos (UML, MER, Ishikawa, Casos de Uso), mockups e informes de avance.
3. **`/Producto`**: Código fuente de la app, backend en FastAPI, scripts de base de datos y registro de dependencias.

---

## 🚀 Estado de Avance del Proyecto

### ✅ Módulos y Entregables Terminados
* **Diseño UX/UI:** Mockups finalizados bajo el estándar "Clean UI" enfocados en el panel de control, mapa y chat.
* **Planificación Técnica:** Diagramas de Casos de Uso, Diagrama de Ishikawa y alcance del proyecto definidos.

### 🚧 Módulos en Construcción (Desarrollo Activo)
* **1. Módulo de Puntos y Recompensas (Core):** Programación del sistema de "Affini Points". Incluye el registro de actos de servicio, el canje de recompensas en la vida real y la gestión de retos de desconexión (ej. citas sin celular).
* **2. Módulo de Comunicación y Asistencia IA:** Desarrollo con FastAPI de la bandeja de 3 chats (privado de pareja, individual con IA y terapia grupal con IA), incorporando análisis de sentimiento y sugerencia de respuestas empáticas.
* **3. Módulo de Gestión y Reportería (CRUD):** Login, vinculación de cuentas por código QR, panel de dashboard con el índice de afinidad y exportación de reportes de la relación.
* **4. Módulo de Mapa y Seguridad:** Integración de Mapbox para ubicación en tiempo real, botón de pánico S.O.S y activación de geofencing para detectar "Tiempo de Calidad" al estar físicamente juntos.
* **5. Validación Multimedia IA:** Lógica para asignar puntos de forma automática al analizar el nivel de bienestar en fotos o evidencias de salidas de la pareja.

## ⚙️ Ejecución local completa

### Requisitos previos
* Windows 10/11
* Python 3.11+ / 3.13
* Node.js 18+ y npm
* Git

### 1) Arrancar backend
```powershell
cd producto\app_AffiniScore\backend
.venv\Scripts\activate.bat
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2) Arrancar frontend
```powershell
cd producto\app_AffiniScore\frontend
npm install
npm run start -- --no-open --port 4201
```

### 3) Ejecutar todo con un solo script
Desde la raíz del repositorio, ejecuta:
```powershell
start_local.bat
```
Esto abrirá una ventana para el backend y otra para el frontend.

### 4) Credenciales de Supabase
El archivo local de configuración `producto/app_AffiniScore/frontend/src/environments/environment.ts` está en `.gitignore`, por lo que no se sube a GitHub.
El script `start_local.bat` escribe automáticamente las credenciales de Supabase en ese archivo local antes de iniciar el frontend.

### URL de acceso
* Frontend: `http://localhost:4201`
* Backend: `http://localhost:8000`

---
