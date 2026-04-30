# 📥 Guía: Descargar y Probar en Otro PC

## ✅ Estado Actual

Tu rama `featunifrepo_nacver` está completa en GitHub con:

- ✓ 4 Features implementados (3.1, 3.2, 3.3, 3.4)
- ✓ ~900 líneas de código nuevo
- ✓ Guías de testing y defensa
- ✓ Todos los archivos sincronizados

---

## 📥 Pasos para Descargar en Otro PC

### Paso 1: Clonar el repositorio

```bash
git clone https://github.com/cristobal247/app_AffiniScore.git
cd app_AffiniScore
```

### Paso 2: Cambiarse a la rama correcta

```bash
git checkout featunifrepo_nacver
```

### Paso 3: Verificar que estés en la rama correcta

```bash
git branch
# Deberías ver: * featunifrepo_nacver
```

### Paso 4: Instalar dependencias del frontend

```bash
cd frontend
npm install
```

Este comando descargará todos los packages necesarios (puede tomar 2-3 minutos).

### Paso 5: Correr la aplicación

```bash
npm start
```

Abre tu navegador en: `http://localhost:4200`

---

## 🧪 Qué Testear Inmediatamente

Una vez que la app carge, sigue estos pasos rápidos:

### 1. Login
- Email: `test@example.com`
- Password: `test123456`

### 2. Verifica los 4 Features

**Feature 1: Privacy Toggles**
- Ve a: Menu inferior → Profile tab
- Busca sección "Configuración de Privacidad"
- Clickea cualquier toggle
- Deberías ver loading spinner + toast verde
- Recarga la página (F5) → el toggle debe mantener su estado ✓

**Feature 2: Bingo Minigame**
- Ve a: Profile tab → Botón "Jugar Bingo"
- Clickea 3 celdas que formen una línea (horizontal, vertical o diagonal)
- Deberías ver toast grande "¡¡¡GANARON!!!"  ✓

**Feature 3: Geofencing + Mapa**
- Ve a: Menu inferior → Mapa tab
- Espera 2 segundos a que cargue el mapa
- Clickea botón "Monitorear Proximidad"
- Espera 5 segundos
- Deberías ver card azul "🎯 Modo Tiempo de Calidad" ✓

**Feature 4: Memories Gallery**
- Ve a: Profile tab → Botón "Ver Recuerdos"
- Deberías ver interfaz de galería
- Si no hay fotos es normal (depende de los datos en BD) ✓

---

## 📋 Checklist para Defender

Antes de llegar a la presentación, verifica:

```
□ npm install termina sin errores
□ npm start inicia sin errores en consola
□ Puedes loguear correctamente
□ Privacy toggles guardan datos
□ Bingo carga y puedes ganar
□ Mapa carga sin errores
□ Geofencing activa con <50m
□ Memories galería visible
□ No hay errores en F12 → Console
```

---

## 📂 Archivos Principales a Revisar

```
frontend/src/app/
├── services/
│   └── supabase.ts              ← 22 métodos nuevos
├── pages/
│   ├── profile/
│   │   ├── profile.page.ts      ← Privacy toggles
│   │   ├── bingo.page.ts        ← Bingo minigame
│   │   ├── bingo.page.html
│   │   ├── memories.page.ts     ← Galería
│   │   └── memories.page.html
│   └── mapa/
│       ├── mapa.page.ts         ← Geofencing
│       └── mapa.page.html
└── app.routes.ts                ← +2 rutas nuevas

ROOT DEL PROYECTO:
├── TESTING_AND_DEFENSE_GUIDE.md ← LÉEME (guía completa)
├── QUICK_REFERENCE.txt          ← Referencia rápida
└── TAREAS_COMPLETADAS_RESUMEN.md
```

---

## 🚨 Si Algo No Funciona

### ❌ "npm install falla"
```bash
# Limpia cache y reintentar
npm cache clean --force
npm install
```

### ❌ "npm start falla con errores de compilación"
```bash
# Rebuilds desde cero
rm -rf node_modules
npm install
npm start
```

### ❌ "Las privacy toggles no guardan"
- Verifica que estés logueado
- Abre F12 (DevTools) → Console → busca errores
- Abre F12 → Network → intenta guardar → busca request a Supabase

### ❌ "El mapa no carga"
- Es normal si no hay permiso de geolocalización
- El mapa seguirá funcionando con ubicación simulada
- No es error de código

### ❌ "Bingo no se carga"
- Verifica que llegues a `/tabs/bingo`
- Abre F12 → Console
- Recarga la página (Ctrl+Shift+R hard reload)

---

## 🔄 Git Commands Útiles

Ver qué rama estás:
```bash
git branch
```

Ver commits en esta rama:
```bash
git log --oneline -10
```

Ver cambios entre esta rama y main:
```bash
git diff origin/main...featunifrepo_nacver --stat
```

---

## 📞 Información de Contacto

Si necesitas actualizar algo:

1. Haz cambios en tu PC
2. Commit: `git commit -m "descripción"`
3. Push: `git push origin featunifrepo_nacver`
4. En el otro PC: `git pull origin featunifrepo_nacver`

---

## 💡 Tips para la Presentación

1. **Prepara 2 ventanas:**
   - Una con la app corriendo
   - Otra con TESTING_AND_DEFENSE_GUIDE.md abierto

2. **Prepara el código:**
   - Ten listo VS Code con los archivos
   - Ve a supabase.ts línea 914 (Haversine formula)
   - Ve a bingo.page.ts línea 95 (Win detection)

3. **Demo en vivo:**
   - Primero muestra Privacy toggles (más rápido)
   - Luego Bingo (es visual y cool)
   - Luego Mapa (geofencing toma 5 segundos)
   - Finalmente Memories (si hay tiempo)

4. **Timing:**
   - Cada feature 1-2 minutos = 5 minutos total
   - Explicación de código 2-3 minutos
   - Total: 8-10 minutos de presentación

---

## ✅ Resumen

| Paso | Comando | Duración |
|------|---------|----------|
| Clonar | `git clone ...` | 30 segundos |
| Rama | `git checkout ...` | 2 segundos |
| Instalar | `npm install` | 2-3 minutos |
| Correr | `npm start` | 10 segundos |
| **TOTAL** | | **5-6 minutos** |

Una vez que completes estos pasos, **todo estará listo para testear y defender**. 🚀

---

**Rama:** `featunifrepo_nacver`  
**Repository:** https://github.com/cristobal247/app_AffiniScore  
**Última actualización:** 2026-04-30

¡Éxito en la presentación! 🎉
