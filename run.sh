#!/bin/bash
set -e

cwd="$(cd "$(dirname "$0")" && pwd)"
backend="$cwd/backend"

cd "$cwd"
docker compose down
docker compose up --build -d --wait

cd "$backend"
go build -o ./bin/server .
./bin/server &1>/dev/null
