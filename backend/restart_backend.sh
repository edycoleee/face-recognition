#!/bin/bash
# Restart backend script

echo "🔄 Stopping existing backend..."
pkill -f "python main.py" 2>/dev/null
sleep 2

echo "🚀 Starting backend..."
cd /home/sultan/face-recognition/backend/app
nohup python main.py > backend.log 2>&1 &

echo "⏳ Waiting for backend to start..."
sleep 5

echo "✅ Checking backend status..."
if curl -s http://192.168.30.21:5000/api/halo > /dev/null 2>&1; then
    echo "✅ Backend is running!"
    echo ""
    echo "📊 Backend Info:"
    curl -s http://192.168.30.21:5000/api/halo | head -10
else
    echo "❌ Backend failed to start!"
    echo ""
    echo "📋 Last 20 lines of log:"
    tail -20 backend.log
fi
