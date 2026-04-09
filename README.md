# AffiniScore v0.01

AffiniScore v0.01 es una app demo en Flutter para parejas. Esta plantilla incluye una navegación inferior con 4 secciones, un dashboard de afinidad, una vista de chat, un mapa con privacidad y una pantalla de desafíos cortos.

## Qué hace la demo

- Dashboard: muestra un índice de afinidad, puntos acumulados y un token de emparejamiento.
- Chat: simula una conversación entre dos miembros de la pareja.
- Mapa: incluye un interruptor de privacidad para activar o desactivar el GPS de forma independiente.
- Desafíos: permite marcar tareas cortas para sumar puntos.
- S.O.S: envía una alerta simulada con ubicación y audio de 5 segundos.
- Supabase: queda preparado para conexión futura, pero en esta versión usa datos mock.

## Cómo correr el código

1. Abre una terminal en la carpeta del proyecto.
2. Ejecuta `flutter pub get` para instalar dependencias.
3. Inicia el proyecto con uno de estos comandos:
	- `flutter run`
	- `flutter run -d windows`
	- `flutter run -d chrome`
4. Si cambias el código, usa hot reload con `r` en la terminal o el botón de recarga del IDE.

## Manual de usuario

### Dashboard

- Aquí ves el índice de afinidad actual.
- El anillo circular representa el porcentaje de afinidad.
- Los puntos aparecen separados entre usuario y pareja.
- El token de emparejamiento sirve como demo para vincular cuentas.

### Chat

- Esta pestaña es una simulación de conversación.
- No envía mensajes reales todavía.
- Sirve como base visual para la futura sincronización.

### Mapa

- El interruptor controla una simulación de privacidad.
- Si lo activas, la app muestra GPS activo en modo demo.
- Si lo desactivas, la app muestra que el GPS está apagado.

### Desafíos

- Marca tareas simples como completadas.
- Cada tarea suma puntos al contador compartido.
- Si desmarcas una tarea, los puntos vuelven a restarse.

### Botón S.O.S

- Está en la parte inferior derecha.
- Simula el envío de ubicación y un audio corto de emergencia.
- En esta versión no llama APIs reales.

## Supabase

El archivo `lib/main.dart` incluye una clase de configuración llamada `SupabaseConfig`.

Si quieres conectarlo de verdad:

1. Crea un proyecto en Supabase.
2. Copia la URL y la clave anónima.
3. Pega esos valores en `SupabaseConfig.url` y `SupabaseConfig.anonKey`.
4. Luego vuelve a correr la app.

## Estructura general

- `lib/main.dart`: contiene toda la interfaz demo.
- `pubspec.yaml`: lista dependencias como `supabase_flutter`.
- `README.md`: guía de uso y ejecución.

## Requisitos

- Flutter instalado.
- Un entorno compatible con Android, Windows, macOS, iOS o Chrome según dónde quieras probarla.

## Nota

Esta versión está pensada para demostración académica y prototipado. Usa datos de prueba y una integración mínima con Supabase para que puedas completarla después.
