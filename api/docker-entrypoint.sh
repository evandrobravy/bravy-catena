#!/bin/sh
set -e
echo "[entrypoint] Aplicando migrações Prisma..."
pnpm prisma migrate deploy
echo "[entrypoint] Iniciando API..."
exec node dist/main.js
