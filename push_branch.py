#!/usr/bin/env python3
import subprocess
import sys
import os

os.chdir(r'C:\Users\nacho\Downloads\AffiniScore-Project\AffiniScore-Project')

try:
    # Verificar status
    result = subprocess.run(['git', 'status'], capture_output=True, text=True)
    print("=== GIT STATUS ===")
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    
    # Hacer push de la rama
    print("\n=== PUSHING BRANCH ===")
    result = subprocess.run(['git', 'push', '-u', 'origin', 'featunifrepo_nacver'], 
                          capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    
    print("\n=== BRANCHES ===")
    result = subprocess.run(['git', 'branch', '-v'], capture_output=True, text=True)
    print(result.stdout)
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
