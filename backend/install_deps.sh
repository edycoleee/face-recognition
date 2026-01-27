#!/bin/bash

# Script untuk install ulang dependencies dengan versi yang benar
# Mengatasi konflik numpy, opencv, dan scipy

echo "🔄 Uninstalling conflicting packages..."
pip uninstall -y opencv-python-headless numpy 2>/dev/null

echo "📦 Installing dependencies from requirements.txt..."
cd "$(dirname "$0")"
pip install -r requirements.txt --break-system-packages

echo "✅ Verifying installation..."
python3 -c "
import numpy as np
import cv2
import insightface
import psycopg2
print('numpy:', np.__version__)
print('opencv:', cv2.__version__)
print('insightface: OK')
print('psycopg2: OK')
print('✅ All dependencies installed successfully!')
"

echo ""
echo "🚀 Ready to start backend:"
echo "   cd backend/app && python main.py"
