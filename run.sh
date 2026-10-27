#!/bin/bash
set -e

docker compose --env-file .env down
docker compose --env-file .env up --build -d

cwd=$(pwd)
frontend="$cwd/frontend";
dashui="$cwd/dash-ui";
backend="$cwd/backend"

buildbackend() {
    cd $backend
    if ! go build -o ./bin/server .; then
        cd $backend
        docker compose --env-file .env down
        echo "Build failed"
        exit 1
    fi
}
buildFrontend() {
    cd $frontend
    if ! bun install; then
        echo "Build failed"
        exit 1
    fi
    if ! bun run build; then
        echo "Build failed"
        exit 1
    fi

}
buildDashUI() {
    cd $dashui
    if ! bun install; then
        echo "Build failed"
        exit 1
    fi
    if ! bun run build; then
        echo "Build failed"
        exit 1
    fi
}

echo "Waiting for services..."
sleep 3

buildFrontend  &
buildDashUI &

cd $backend
./server
