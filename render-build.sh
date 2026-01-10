#!/usr/bin/env bash
# exit on error
set -o errexit

pnpm install
npx prisma generate
npx prisma migrate deploy
pnpm run build