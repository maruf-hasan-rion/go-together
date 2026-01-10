#!/usr/bin/env bash
set -e

echo "Generating Prisma client..."
npx prisma generate

echo "Applying migrations..."
npx prisma migrate deploy

echo "Building TS..."
npm run build

echo "Copying generated prisma client to dist..."
rm -rf dist/generated
mkdir -p dist/generated
cp -R src/generated/prisma dist/generated/prisma

echo "Build done."
