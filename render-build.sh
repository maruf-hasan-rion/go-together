#!/usr/bin/env bash
set -e

# Render sets NODE_ENV=production, and package managers skip devDependencies in
# production — but the build needs typescript + prisma. Force development here;
# the running service still uses the platform's NODE_ENV.
export NODE_ENV=development

echo "Installing dependencies..."
pnpm install --frozen-lockfile --ignore-scripts

echo "Generating Prisma client..."
pnpm exec prisma generate

echo "Applying migrations..."
pnpm exec prisma migrate deploy

echo "Building TS..."
pnpm run build

echo "Build done."
