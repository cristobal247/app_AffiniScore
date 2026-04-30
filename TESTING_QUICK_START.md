# 🧪 PASOS RÁPIDOS PARA TESTEAR

## 1️⃣ COMPILAR

### Windows (Más fácil):
```
1. Double-click en: run-build.bat
2. Espera a que termine
3. Debería decir "COMPILACION EXITOSA"
```

### O manualmente:
```bash
cd C:\Users\nacho\Downloads\AffiniScore-Project\AffiniScore-Project\frontend
npm install
npm run build
```

**✓ Si compila sin errores, estamos bien**

---

## 2️⃣ INICIAR SERVIDOR

### Windows (Más fácil):
```
1. Double-click en: run-dev.bat
2. Espera el mensaje "Compiled successfully"
3. Abre: http://localhost:4200
```

### O manualmente:
```bash
cd C:\Users\nacho\Downloads\AffiniScore-Project\AffiniScore-Project\frontend
npm start
```

**Cuando veas:** `✔ Compiled successfully` - ¡Listo!

---

## 3️⃣ PROBAR CADA FEATURE

### Tarea 3.1 - Privacy Toggles
```
1. Navega a: Profile
2. Busca en el final: "Compartir ubicación" + "Notificaciones"
3. Prueba encender/apagar
4. Deberías ver toasts verdes
✓ FUNCIONA SI: Ves toasts de "Guardado"
```

### Tarea 3.2 - Bingo Minigame
```
1. Navega a: http://localhost:4200/tabs/bingo
2. Deberías ver grilla 3x3 con 9 tareas
3. Haz clic en celdas (cambian de color)
4. Completa una línea (ej: primera fila)
5. Deberías ver animación de victoria 🎉
✓ FUNCIONA SI: Ves grilla + animación de "¡¡¡GANARON!!!"
```

### Tarea 3.3 - Geofencing + Mapbox
```
1. Navega a: Mapa
2. Haz clic en: "Monitorear Proximidad"
3. Deberías ver:
   - Mapa con marcador azul (tu ubicación)
   - Círculo verde punteado (50m)
   - Distancia en display
4. Espera 5 segundos
5. Si ubica pareja cerca, verás: "Modo Tiempo de Calidad"
✓ FUNCIONA SI: Ves el mapa + marcador + círculo
```

### Tarea 3.4 - Recuerdos Compartidos
```
1. Navega a: http://localhost:4200/tabs/memories
2. Deberías ver galería (vacía por ahora)
3. Haz clic en: "Agregar Recuerdo"
4. Intenta subir una imagen
✓ FUNCIONA SI: Ves la galería + botón de agregar
```

---

## ⚠️ SI HAY ERRORES

### Error: "Cannot find module"
```bash
npm install
npm install --save-dev
npm run build
```

### Error: "ng serve not found"
```bash
npm install @angular/cli
npm start
```

### El mapa no funciona
- Verifica permisos de ubicación en el navegador
- Abre la consola (F12) y busca errores

### Routes no funcionan
- Recarga la página completamente: Ctrl+F5 (o Cmd+Shift+R en Mac)

---

## 📊 SIGNOS DE ÉXITO

✅ **App compila sin errores**
✅ **Abre en http://localhost:4200**
✅ **Login funciona**
✅ **Puedes navegar entre tabs**
✅ **Ves Privacy toggles en Profile**
✅ **Puedes ver ruta /tabs/bingo**
✅ **Puedes ver ruta /tabs/memories**
✅ **Mapa muestra ubicación**

---

## 📁 ARCHIVOS IMPORTANTES

**Para testear localmente necesitas revisar:**
- ✅ `frontend/src/app/pages/profile/bingo.page.ts`
- ✅ `frontend/src/app/pages/profile/memories.page.ts`
- ✅ `frontend/src/app/pages/mapa/mapa.page.ts` (modificado)
- ✅ `frontend/src/app/services/supabase.ts` (con 22 métodos nuevos)
- ✅ `frontend/src/app/app.routes.ts` (con rutas nuevas)

---

## 🎯 PRÓXIMOS PASOS DESPUÉS DE TESTEAR

Si todo funciona:
1. ✅ Crear tablas en Supabase (ver GUIA_TESTING.md)
2. ✅ Conectar datos reales
3. ✅ Hacer Tarea 3.5 (Push Notifications)

---

**¿Necesitas ayuda con algo específico?**
Avísame qué error ves o qué no funciona.
