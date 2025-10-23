#!/bin/bash

echo "🚀 Starting Avenai in Stable Development Mode..."

# Kill any existing processes
echo "🔄 Stopping existing processes..."
pkill -f "next dev" 2>/dev/null || true

# Clean up caches and temporary files
echo "🧹 Cleaning caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

# Verify environment
echo "🔍 Checking environment..."
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found!"
    echo "Please create .env.local with your configuration"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
npx prisma generate

# Start development server
echo "🎯 Starting development server..."
npm run dev
