#!/usr/bin/env bash
set -e

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Generating Prisma client..."
pnpm exec prisma generate

echo "Applying migrations..."
pnpm exec prisma migrate deploy

echo "Building TS..."
pnpm run build

echo "Build done."
