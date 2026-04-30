# 🧹 Archivos a Limpiar - Manual

## Archivos Redundantes (ELIMINAR)

### 📄 Documentación Antigua (10 archivos)
```
GUIA_CONTINUAR.md              → Reemplazado por TESTING_AND_DEFENSE_GUIDE.md
GUIA_TESTING.md                → Reemplazado por TESTING_AND_DEFENSE_GUIDE.md
PRESENTACION_DEFENSA.md        → Duplicado/antiguo
README_DOCUMENTACION.md        → Duplicado/antiguo
RESUMEN_FINAL.md               → Duplicado/antiguo
SCRIPT_DEFENSA.md              → Duplicado/antiguo
TESTING_QUICK_START.md         → Reemplazado por QUICK_REFERENCE.txt
TAREA_3_2_BINGO_RESUMEN.md     → Información en TESTING_AND_DEFENSE_GUIDE.md
TAREA_3_3_MAPBOX_RESUMEN.md    → Información en TESTING_AND_DEFENSE_GUIDE.md
Reporte_Integracion_AffiniScore.ipynb  → Jupyter notebook (no necesario)
```

### 🔧 Scripts Antiguos (6 archivos)
```
build-bingo.bat        → Reemplazado por run-build.bat
build-test.bat         → Duplicado
commit-bingo.sh        → Reemplazado por commit-fixes.bat
create_branch.bat      → Ya no necesario
push_branch.py         → Reemplazado por push-all.bat
verify-setup.sh        → No necesario
```

---

## ✅ Archivos a MANTENER

### 📄 Documentación Principal (5 archivos)
```
TESTING_AND_DEFENSE_GUIDE.md   ⭐ Guía PRINCIPAL de testing + defensa
QUICK_REFERENCE.txt             ⭐ Referencia rápida
DOWNLOAD_AND_TEST_OTHER_PC.md   ⭐ Instrucciones de descarga
FINAL_STATUS.txt                📊 Estado actual
TAREAS_COMPLETADAS_RESUMEN.md   📋 Resumen técnico
PUSH_NOW.txt                    🚀 Instrucciones push
```

### 🔧 Scripts Útiles (4 archivos)
```
push-all.bat         ← PRINCIPAL (hacer push automático)
push.bat             ← Alternativo
run-build.bat        ← Compilar app
run-dev.bat          ← Correr app dev
commit-fixes.bat     ← Hacer commit
```

### 📂 Carpetas
```
frontend/            ← Código Angular/Ionic
backend/             ← Backend (no modificado)
.git/                ← Control de versión
```

---

## 🚀 Cómo Limpiar

### OPCIÓN 1: Manual en Windows Explorer
1. Abre esta carpeta: `C:\Users\nacho\Downloads\AffiniScore-Project\AffiniScore-Project\`
2. Selecciona los archivos listados arriba (Ctrl+Click)
3. Presiona Delete
4. Confirmá

### OPCIÓN 2: PowerShell/CMD (Automático)
```bash
cd C:\Users\nacho\Downloads\AffiniScore-Project\AffiniScore-Project

# Eliminar archivos de documentación antigua
Remove-Item "GUIA_CONTINUAR.md"
Remove-Item "GUIA_TESTING.md"
Remove-Item "PRESENTACION_DEFENSA.md"
Remove-Item "README_DOCUMENTACION.md"
Remove-Item "RESUMEN_FINAL.md"
Remove-Item "SCRIPT_DEFENSA.md"
Remove-Item "TESTING_QUICK_START.md"
Remove-Item "TAREA_3_2_BINGO_RESUMEN.md"
Remove-Item "TAREA_3_3_MAPBOX_RESUMEN.md"
Remove-Item "Reporte_Integracion_AffiniScore.ipynb"

# Eliminar scripts antiguos
Remove-Item "build-bingo.bat"
Remove-Item "build-test.bat"
Remove-Item "commit-bingo.sh"
Remove-Item "create_branch.bat"
Remove-Item "push_branch.py"
Remove-Item "verify-setup.sh"
```

### OPCIÓN 3: Usando Git (Recomendado)
```bash
cd C:\Users\nacho\Downloads\AffiniScore-Project\AffiniScore-Project

git rm GUIA_CONTINUAR.md
git rm GUIA_TESTING.md
git rm PRESENTACION_DEFENSA.md
# ... etc para los demás

git commit -m "chore: Remove redundant documentation and old scripts"
git push origin featunifrepo_nacver
```

---

## 📊 Resultado de Limpieza

**ANTES:**
- 30+ archivos en root
- 10 archivos de docs duplicados
- 6 scripts antiguos
- Muy confuso

**DESPUÉS:**
- 15 archivos en root (SOLO esenciales)
- 5 docs principales + 1 de estado
- 4 scripts útiles
- Limpio y organizado ✓

---

## ✅ Después de Limpiar

```bash
git add -A
git commit -m "chore: Clean up redundant files

- Removed old documentation (GUIA_*.md, PRESENTACION_*.md, etc)
- Removed old scripts (build-bingo.bat, verify-setup.sh, etc)
- Kept only essential guides for testing and defense

Maintained:
- TESTING_AND_DEFENSE_GUIDE.md (main reference)
- QUICK_REFERENCE.txt (cheat sheet)
- DOWNLOAD_AND_TEST_OTHER_PC.md (download instructions)
- Essential scripts (push-all.bat, run-*.bat, etc)"

git push origin featunifrepo_nacver
```

---

**¡Listo! Tu repo quedará mucho más limpio.** ✨
