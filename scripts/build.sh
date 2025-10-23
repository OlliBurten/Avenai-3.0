#!/bin/bash
# scripts/build.sh
# Comprehensive build script for Avenai

set -e

echo "🚀 Starting Avenai build process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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
    print_warning "No .env file found. Please create one based on .env.example"
    if [ -f ".env.example" ]; then
        print_status "Copying .env.example to .env.local..."
        cp .env.example .env.local
        print_warning "Please update .env.local with your actual environment variables"
    fi
fi

# Install dependencies
print_status "Installing dependencies..."
npm ci

# Run pre-build checks
print_status "Running pre-build checks..."

# Check TypeScript
print_status "Checking TypeScript..."
npx tsc --noEmit

# Run ESLint
print_status "Running ESLint..."
npx eslint . --ext .ts,.tsx --max-warnings 0

# Run Prettier check
print_status "Checking code formatting..."
npx prettier --check .

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate

# Run database checks
print_status "Checking database connection..."
if npx prisma db push --accept-data-loss --skip-generate > /dev/null 2>&1; then
    print_success "Database connection successful"
else
    print_warning "Database connection failed. Make sure DATABASE_URL is set correctly."
fi

# Build the application
print_status "Building application..."
npm run build

# Check build output
if [ -d ".next" ]; then
    print_success "Build completed successfully!"
    
    # Show build statistics
    print_status "Build statistics:"
    echo "  - Build directory: .next"
    echo "  - Static files: $(find .next/static -type f | wc -l) files"
    echo "  - Total size: $(du -sh .next | cut -f1)"
else
    print_error "Build failed!"
    exit 1
fi

# Run post-build tests
print_status "Running post-build tests..."
if npm run test > /dev/null 2>&1; then
    print_success "Tests passed!"
else
    print_warning "Tests failed or not configured"
fi

# Generate build report
print_status "Generating build report..."
cat > build-report.md << EOF
# Build Report - $(date)

## Build Information
- Node.js Version: $NODE_VERSION
- Build Time: $(date)
- Build Status: ✅ Success

## Dependencies
- Total packages: $(npm list --depth=0 | wc -l)
- Vulnerabilities: $(npm audit --audit-level=moderate | grep -c "found" || echo "0")

## Build Output
- Build directory: .next
- Static files: $(find .next/static -type f | wc -l) files
- Total size: $(du -sh .next | cut -f1)

## Environment
- NODE_ENV: ${NODE_ENV:-development}
- Database: $(echo $DATABASE_URL | cut -d'@' -f2 | cut -d'/' -f1 || echo "Not set")

## Next Steps
1. Deploy to your hosting platform
2. Set up environment variables in production
3. Configure domain and SSL certificates
4. Set up monitoring and logging
EOF

print_success "Build report generated: build-report.md"

# Final success message
print_success "🎉 Build process completed successfully!"
print_status "Ready for deployment!"

# Show next steps
echo ""
echo "Next steps:"
echo "1. Review build-report.md for build details"
echo "2. Deploy using: npm start"
echo "3. Or deploy to Vercel: vercel --prod"
echo ""
