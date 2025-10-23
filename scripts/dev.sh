#!/bin/bash
# scripts/dev.sh
# Development environment setup script

set -e

echo "🔧 Setting up Avenai development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v)
print_status "Node.js version: $NODE_VERSION"

# Check if .env file exists
if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
    print_warning "No .env file found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        print_success "Created .env.local from .env.example"
        print_warning "Please update .env.local with your actual environment variables"
    else
        print_error ".env.example not found. Please create environment configuration."
        exit 1
    fi
fi

# Install dependencies
print_status "Installing dependencies..."
npm install

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate

# Run database setup
print_status "Setting up database..."
if npx prisma db push > /dev/null 2>&1; then
    print_success "Database schema updated successfully"
else
    print_warning "Database setup failed. Please check your DATABASE_URL"
fi

# Run linting
print_status "Running ESLint..."
if npx eslint . --ext .ts,.tsx --max-warnings 0 > /dev/null 2>&1; then
    print_success "ESLint checks passed"
else
    print_warning "ESLint found issues. Run 'npm run lint' to see details"
fi

# Run TypeScript check
print_status "Running TypeScript check..."
if npx tsc --noEmit > /dev/null 2>&1; then
    print_success "TypeScript check passed"
else
    print_warning "TypeScript found issues. Run 'npx tsc --noEmit' to see details"
fi

# Start development server
print_status "Starting development server..."
print_success "🎉 Development environment ready!"
print_status "Starting Next.js development server on http://localhost:3000"

npm run dev
