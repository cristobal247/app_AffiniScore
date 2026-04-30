#!/bin/bash
cd C:\Users\nacho\Downloads\AffiniScore-Project\AffiniScore-Project

echo "Agregando cambios al git..."
git add -A

echo "Haciendo commit de Tarea 3.2 - Bingo..."
git commit -m "feat: Implementar Tarea 3.2 - Minijuego Bingo de Conexión

- Crear componente BingoPage (TypeScript, HTML, SCSS)
- Agregar grilla 3x3 con 9 tareas interactivas
- Implementar detección de líneas ganadoras (3 en raya)
- Agregar métodos en SupabaseService: getBingoCard, getBingoProgress, markBingoCellComplete, checkBingoWin
- Agregar interfaces: BingoCard, BingoCellTask, BingoProgress
- Agregar ruta /tabs/bingo en app.routes.ts
- Implementar persistencia de progreso en Supabase
- Toast notifications para retroalimentación
- Diseño responsive y animaciones
- Todos los comentarios en español

Tareas incluidas en el cartón:
- Besarse, Bailar, Reír, Abrazarse
- Mirada profunda, Ejercicio, Cocinar
- Salida sorpresa, Masaje relajante

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"

echo "Commit completado!"
