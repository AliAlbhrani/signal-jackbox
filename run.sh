#!/bin/bash
set -e

docker compose --env-file .env down
docker compose --env-file .env up --build -d

cd backend
if ! go build -o ./bin/server .; then
    cd ..
    docker compose --env-file .env down
    echo "Build failed"
    exit 1
fi

echo "Waiting for services..."
sleep 3

./server
