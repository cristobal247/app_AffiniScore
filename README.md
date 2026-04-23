# 💖 AffiniScore

## 📖 Información Base del Proyecto
**AffiniScore** es una aplicación móvil nativa diseñada para fortalecer la salud relacional y la comunicación en parejas adultas (mayores de 30 años). La plataforma actúa como un espacio digital seguro que facilita la conexión mediante un "Terapeuta de Pareja IA", herramientas de conciencia espacial (geofencing), seguridad (S.O.S) y un canal de comunicación ultra privado.
* **Cliente:** Cristián Gómez (Academia Tecnológica Triskeledu).
* **Metodología:** Aprendizaje Basado en Problemas (ABP) / Scrum.

## 👥 Equipo de Desarrollo
* **Belén Toloza:** Jefa de Proyecto y Analista Programador.
* **Ignacio Álvarez:** Analista de Base de Datos y Analista QA.
* **Cristóbal Paredes:** Analista de Base de Datos y Analista Programador.

## 🛠️ Tecnologías Utilizadas
* **Frontend:** Ionic Framework y Angular (Aplicación Móvil).
* **Backend (Intermedio y WebSockets):** FastAPI (Python) para la gestión del chat en tiempo real y la orquestación de los prompts de la Inteligencia Artificial.
* **Backend y Base de Datos:** Supabase (Almacenamiento y sincronización).
* **Geolocalización:** API de Google Maps (@angular/google-maps).
* **Inteligencia Artificial:** Gemini / Google AI Studio (Procesamiento del Terapeuta IA).

## 📁 Estructura del Repositorio (Control de Auditoría)
Para dar cumplimiento a las normativas de auditoría de Casa Central, este repositorio se divide estrictamente en tres directorios:
1. **`/Gestión`**: Actas de reunión, documento de identificación del proyecto (Guía 1) y el archivo de conformación del equipo (`Integrantes.txt`).
2. **`/Documentación`**: Carta Gantt, diagramas técnicos (UML, MER, Casos de Uso Nivel Cero), mockups e informes de avance.
3. **`/Producto`**: Código fuente de la aplicación frontend, backend en FastAPI, scripts de bases de datos y registro de dependencias.

---

## 🚀 Estado de Avance del Proyecto

### ✅ Módulos y Entregables Terminados
* **Diseño UX/UI:** Mockups y wireframes finalizados bajo el estándar visual "Clean UI" (tipografía SF Pro, paleta blanco hueso y salmón).
* **Planificación y Arquitectura:** Diagramas de Casos de Uso, Modelo Entidad-Relación (MER), Diagrama de Ishikawa y arquitectura de software definidos.
* **Prototipo Base:** Diseño e ilustración de "Lumi" (Avatar IA) en formato vectorial y sus distintos estados.
* **Documentación:** Creación de Historias de Usuario sin gamificación y definición del "Definition of Done" (DoD).

### 🚧 Módulos en Construcción (Desarrollo Activo)
* **Configuración del Entorno:** Integración de la estructura inicial del proyecto en Ionic/Angular y configuración del servidor backend con FastAPI.
* **Módulo de Gestión (CRUD base):** Programación del sistema de Login, autenticación y sincronización de cuentas de pareja.
* **Conexión a Base de Datos:** Vinculación del frontend y el backend con Supabase.
* **Módulo de Comunicación y Asistencia IA:** Programación de la "Bandeja de Chats" gestionada por FastAPI, la cual incluye:
    1. Chat ultra privado exclusivo para la pareja.
    2. Chat individual de cada usuario con el Terapeuta IA (Lumi).
    3. Chat grupal (simulación de terapia de a tres) moderado por la IA.
* **Avatar Virtual:** Maquetación e integración de los componentes de "Lumi" y sus animaciones de estado dentro de la aplicación.
```
