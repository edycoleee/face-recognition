#!/bin/bash

# Script to apply database schema updates without losing data

echo "🔄 Applying database schema updates..."

# Get container name
CONTAINER=$(docker-compose ps -q postgres)

if [ -z "$CONTAINER" ]; then
    echo "❌ PostgreSQL container not running"
    echo "Run: docker-compose up -d"
    exit 1
fi

echo "📊 Checking current tables..."
docker exec $CONTAINER psql -U postgres -d face_recognition -c "\dt"

echo ""
echo "📝 Applying init.sql..."
docker exec -i $CONTAINER psql -U postgres -d face_recognition < init.sql

echo ""
echo "✅ Schema updated! Current tables:"
docker exec $CONTAINER psql -U postgres -d face_recognition -c "\dt"

echo ""
echo "📋 Checking face_embeddings table structure:"
docker exec $CONTAINER psql -U postgres -d face_recognition -c "\d face_embeddings"
