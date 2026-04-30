# 🧪 GUÍA DE TESTING - AFFINI SCORE

## ✅ REQUISITOS PREVIOS

Antes de compilar y ejecutar, asegúrate de tener:

### 1. **Node.js + npm**
```bash
node --version  # Debe ser v16+
npm --version   # Debe ser v8+
```

### 2. **Ionic CLI** (opcional pero recomendado)
```bash
npm install -g @ionic/cli
```

### 3. **Base de Datos Supabase**
Necesitas crear estas tablas en tu proyecto Supabase:

#### Tablas de Privacidad y Notificaciones (Tarea 3.1)
```sql
CREATE TABLE user_privacy_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE,
  share_location BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Tablas de Recuerdos Compartidos (Tarea 3.4)
```sql
CREATE TABLE shared_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partnership_id UUID NOT NULL,
  image_url VARCHAR,
  date DATE,
  notes TEXT,
  voice_note_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Buckets de Storage
- `memory_images` - Para guardar fotos
- `memory_voice_notes` - Para guardar notas de voz

#### Tablas de Bingo (Tarea 3.2)
```sql
CREATE TABLE bingo_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255),
  difficulty VARCHAR(20),
  cells JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bingo_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partnership_id UUID NOT NULL,
  card_id UUID NOT NULL,
  completed_cells TEXT[] DEFAULT '{}',
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(partnership_id, card_id)
);
```

#### Tablas de Geofencing (Tarea 3.3)
```sql
CREATE TABLE quality_time_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partnership_id UUID NOT NULL,
  latitude NUMERIC,
  longitude NUMERIC,
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  duration_minutes INTEGER,
  bonus_points INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  accuracy NUMERIC,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 PASOS PARA EJECUTAR

### OPCIÓN 1: Usar Scripts Batch (Windows)

#### 1. Compilar
Double-click en: `run-build.bat`
```bash
# O manualmente en cmd:
cd C:\Users\nacho\Downloads\AffiniScore-Project\AffiniScore-Project\frontend
npm install
npm run build
```

#### 2. Iniciar Dev Server
Double-click en: `run-dev.bat`
```bash
# O manualmente:
npm start
```

La app estará en: **http://localhost:4200**

### OPCIÓN 2: Terminal Bash/Cmd Directa

```bash
# 1. Navegar al proyecto
cd C:\Users\nacho\Downloads\AffiniScore-Project\AffiniScore-Project\frontend

# 2. Instalar dependencias
npm install

# 3. Compilar
npm run build

# 4. Iniciar dev server
npm start
```

---

## 🧪 TESTING MANUAL

Una vez que la app esté corriendo en http://localhost:4200:

### Tarea 3.1 - Privacy Toggles
1. Navega a: **Profile** → haz scroll al final
2. Busca toggles para "Compartir ubicación" y "Notificaciones push"
3. Prueba encender/apagar - deberías ver toasts de confirmación
4. Recarga la página - los valores deben persistir

### Tarea 3.2 - Minijuego Bingo
1. Navega a: **Tabs** → busca opción **"Bingo"** (o `/tabs/bingo`)
2. Deberías ver una grilla 3x3 con 9 tareas
3. Haz clic en celdas - deberían cambiar de color
4. Completa una línea (horizontal, vertical o diagonal)
5. Deberías ver animación de victoria 🎉

### Tarea 3.3 - Mapbox + Geofencing
1. Navega a: **Mapa**
2. Haz clic en botón **"Monitorear Proximidad"**
3. Deberías ver:
   - Marcador azul (tu ubicación)
   - Círculo verde de 50m
   - Display de distancia
4. El mapa debería actualizar cada 5 segundos
5. Si funciona la simulación, deberías ver "Modo Tiempo de Calidad" activado

### Tarea 3.4 - Recuerdos Compartidos
1. Navega a: **Tabs** → **Memories** (o `/tabs/memories`)
2. Deberías ver una galería vacía (sin fotos aún)
3. Prueba el botón de "Agregar recuerdo"
4. Deberías poder subir una imagen

---

## ⚠️ PROBLEMAS COMUNES

### Error: "Cannot find module '@ionic/angular'"
```bash
npm install
npm install --save-dev
```

### Error: "ReferenceError: isNaN is not defined"
- Recarga la página del navegador
- Limpia cache: `npm cache clean --force`

### El mapa no se carga
- Verifica que Leaflet esté instalado: `npm list leaflet`
- Espera a que Capacitor Geolocation obtenga permiso de ubicación

### Faltan las nuevas rutas (Bingo, Memories)
- Asegúrate de tener actualizado `app.routes.ts`
- Recarga la app completamente (Ctrl+F5)

---

## 📊 CHECKLIST ANTES DE DEFENDER

- [ ] ¿Compila sin errores?
- [ ] ¿Se abre en localhost:4200?
- [ ] ¿Funciona Privacy Toggles (Tarea 3.1)?
- [ ] ¿Funciona Bingo (Tarea 3.2)?
- [ ] ¿Se ve el mapa con geofencing (Tarea 3.3)?
- [ ] ¿Se ven las imágenes en galería Memories (Tarea 3.4)?
- [ ] ¿Los datos persisten después de recargar?

---

## 🔗 RUTAS DE LA APP

| Ruta | Descripción |
|------|-------------|
| `/login` | Login |
| `/register` | Registro |
| `/tabs/dashboard` | Home |
| `/tabs/profile` | Perfil (con toggles) |
| `/tabs/memories` | Galería de recuerdos |
| `/tabs/bingo` | Minijuego Bingo |
| `/tabs/mapa` | Mapa con geofencing |
| `/tabs/chat` | Chat |
| `/tabs/retos` | Retos |
| `/tabs/actions` | Acciones |

---

## 📝 NOTAS IMPORTANTES

⚠️ **MVP Simplificaciones:**
- Bingo cartón es hardcodeado (9 tareas de pareja)
- Geofencing ubica "pareja" en coordenadas simuladas
- Para producción: obtener datos reales de Supabase

✅ **Lo que SÍ funciona:**
- Compilación sin errores
- Interfaces UI completas
- Lógica de cálculos (Haversine, Bingo win detection)
- Persistencia en Supabase (si están creadas las tablas)
- Toast notifications y feedback visual

---

**¿Necesitás ayuda con algo específico del testing?**
