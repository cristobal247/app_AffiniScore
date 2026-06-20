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
* **Backend (Servicios en Tiempo Real e IA):** FastAPI (Python) desplegado de forma externa para la orquestación del chat en tiempo real y servicios de IA.
* **Backend y Base de Datos:** Supabase (Almacenamiento, autenticación y sincronización).
* **Geolocalización:** API de Mapbox.
* **Inteligencia Artificial:** Gemini / Google AI Studio (Procesamiento del Terapeuta IA AffiniCoach, análisis relacional y validación de retos multimedia).

## 📁 Estructura del Repositorio (Control de Auditoría)
Para dar cumplimiento a las normativas de auditoría, este repositorio se divide en tres directorios:
1. **`/Gestión`**: Actas de reunión, documento de identificación del proyecto (Guía 1) y conformación del equipo (`Integrantes.txt`).
2. **`/Documentación`**: Carta Gantt, diagramas técnicos (UML, MER, Ishikawa, Casos de Uso), mockups e informes de avance.
3. **`/Producto`**: Código fuente de la app, backend en FastAPI, scripts de base de datos y registro de dependencias.

---

## 🚀 Despliegue en la Nube (Render & Supabase)
Para evitar la dependencia de la ejecución del backend en modo local y permitir una interacción multidispositivo real entre ambos integrantes de la pareja, los servicios de backend se encuentran alojados en la nube:

* **Servidor Backend (FastAPI):** Hospedado en **Render** (Capa gratuita / *Free Tier*).
  > [!NOTE]
  > Debido a las políticas del plan *Free Tier* de Render, si el backend no recibe peticiones durante unos minutos entra en estado de suspensión. La primera petición web del día o tras inactividad tardará aproximadamente **50 segundos** en responder mientras el contenedor vuelve a iniciarse ("despierta"). 
* **Base de Datos y Seguridad:** Alojada en **Supabase** bajo motor PostgreSQL con políticas activas de RLS (Row Level Security).

Si deseas realizar pruebas de integración y QA inmediatas sin experimentar los tiempos de espera de la nube al iniciar, puedes arrancar el backend en un entorno local.

---

## 📲 Descarga de la Aplicación (APK)
La última versión construida y empaquetada de la aplicación móvil para dispositivos Android está disponible para su instalación y prueba:
* **Enlace de descarga:** [Carpeta Google Drive - APK AffiniScore](https://drive.google.com/drive/folders/18e-Ejemplo-AffiniScore-Drive-APK) *(Por favor, solicita los permisos correspondientes de ser necesario)*.

---

## ⚙️ Ejecución local completa (Desarrollo y Pruebas rápidas)

### Requisitos previos
* Windows 10/11
* Python 3.11+ / 3.13
* Node.js 18+ y npm
* Git

### 1) Arrancar backend localmente
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
Esto abrirá automáticamente una ventana para el backend local y otra para el frontend.

### 4) Credenciales de Supabase
El archivo local de configuración `producto/app_AffiniScore/frontend/src/environments/environment.ts` está en `.gitignore`, por lo que no se sube a GitHub.
El script `start_local.bat` escribe automáticamente las credenciales de Supabase en ese archivo local antes de iniciar el frontend.

### URL de acceso local
* Frontend: `http://localhost:4201`
* Backend: `http://localhost:8000`

---

