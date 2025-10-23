#!/bin/bash
# EU Migration Script - Automated setup
# Usage: ./scripts/migrate-to-eu.sh

set -e  # Exit on error

echo "🌍 AVENAI EU MIGRATION SCRIPT"
echo "=============================="
echo ""

# Check if EU_DATABASE_URL is set
if [ -z "$EU_DATABASE_URL" ]; then
  echo "❌ Error: EU_DATABASE_URL not set"
  echo ""
  echo "Please set your Neon EU connection string:"
  echo "  export EU_DATABASE_URL='postgresql://user:pass@ep-xxxxx.eu-central-1.aws.neon.tech/neondb'"
  echo ""
  exit 1
fi

echo "✅ EU Database URL configured"
echo "   Host: $(echo $EU_DATABASE_URL | grep -oP '@\K[^:/]+')"
echo ""

# Step 1: Enable extensions
echo "📊 Step 1: Enabling PostgreSQL extensions..."
psql "$EU_DATABASE_URL" -f scripts/setup-neon-eu.sql
echo "✅ Extensions enabled"
echo ""

# Step 2: Run Prisma migrations
echo "🔄 Step 2: Running Prisma migrations..."
export DATABASE_URL="$EU_DATABASE_URL"
npx prisma migrate deploy
echo "✅ Migrations complete"
echo ""

# Step 3: Generate Prisma client
echo "⚙️  Step 3: Generating Prisma client..."
npx prisma generate
echo "✅ Prisma client generated"
echo ""

# Step 4: Verify database
echo "🔍 Step 4: Verifying database setup..."
psql "$EU_DATABASE_URL" -c "
  SELECT 
    tablename,
    schemaname
  FROM pg_tables 
  WHERE schemaname = 'public'
  ORDER BY tablename;
"
echo "✅ Database verified"
echo ""

echo "🎉 Neon EU database setup complete!"
echo ""
echo "Next steps:"
echo "  1. Deploy doc-worker to Fly.io fra"
echo "  2. Deploy Next.js to Vercel fra"
echo "  3. Update .env.local with EU_DATABASE_URL"
echo ""



