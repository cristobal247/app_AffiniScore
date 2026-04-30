#!/bin/bash
# Script para verificar setup completo

echo "==========================================="
echo "VERIFYING AFFINI SCORE SETUP"
echo "==========================================="
echo ""

# Check Node.js
echo "[1/5] Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✓ Node.js $NODE_VERSION installed"
else
    echo "✗ Node.js not found"
fi

# Check npm
echo "[2/5] Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "✓ npm $NPM_VERSION installed"
else
    echo "✗ npm not found"
fi

# Check Ionic
echo "[3/5] Checking Ionic..."
if command -v ionic &> /dev/null; then
    IONIC_VERSION=$(ionic --version)
    echo "✓ Ionic $IONIC_VERSION installed"
else
    echo "✗ Ionic not installed (optional, but recommended)"
fi

# Check package.json
echo "[4/5] Checking project structure..."
if [ -f "frontend/package.json" ]; then
    echo "✓ frontend/package.json found"
else
    echo "✗ frontend/package.json not found"
fi

# Check key files
echo "[5/5] Checking implementation files..."
FILES=(
    "frontend/src/app/pages/profile/bingo.page.ts"
    "frontend/src/app/pages/profile/memories.page.ts"
    "frontend/src/app/pages/mapa/mapa.page.ts"
    "frontend/src/app/services/supabase.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file MISSING"
    fi
done

echo ""
echo "==========================================="
echo "READY TO BUILD!"
echo "==========================================="
echo ""
echo "Next steps:"
echo "  1. npm install"
echo "  2. npm run build"
echo "  3. npm start"
echo ""
