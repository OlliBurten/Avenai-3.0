#!/bin/bash

echo "🚀 Setting up Avenai Environment Variables"
echo "=========================================="

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "⚠️  .env.local already exists. Backing up to .env.local.backup"
    cp .env.local .env.local.backup
fi

# Create a clean .env.local file
echo "📝 Creating clean .env.local file..."

# Function to safely read input
read_safe() {
    local prompt="$1"
    local var_name="$2"
    local default="$3"
    
    echo -n "$prompt"
    if [ -n "$default" ]; then
        echo -n " (default: $default): "
    else
        echo -n ": "
    fi
    
    read -r value
    
    if [ -z "$value" ] && [ -n "$default" ]; then
        value="$default"
    fi
    
    echo "$var_name=\"$value\"" >> .env.local
}

# Start with a clean file
> .env.local

echo "🔑 Please provide your environment variables:"
echo ""

# Database URL
read_safe "Enter your DATABASE_URL" "DATABASE_URL" "postgresql://neondb_owner:npg_EuvbtkIdM26R@ep-snowy-leaf-addejok7-pooler.c-2.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

# NextAuth Secret
read_safe "Enter your NEXTAUTH_SECRET" "NEXTAUTH_SECRET" "avenai-secret-key-2024"

# NextAuth URL
read_safe "Enter your NEXTAUTH_URL" "NEXTAUTH_URL" "http://localhost:3000"

# Pinecone API Key
read_safe "Enter your PINECONE_API_KEY" "PINECONE_API_KEY" "pcsk_3CujWM_9pb55yK4hESVkVsQKwQuA5ayWFnYmMcDA2tmT7qeZ98CD5mXHYSGBKMYyXvjip9"

# Pinecone Index Name
read_safe "Enter your PINECONE_INDEX_NAME" "PINECONE_INDEX_NAME" "avenai-docs"

# OpenAI API Key (most important!)
echo ""
echo "🔑 OPENAI API KEY SETUP"
echo "======================="
echo "⚠️  IMPORTANT: Make sure your OpenAI API key is valid and has credits!"
echo "   - Go to https://platform.openai.com/account/api-keys"
echo "   - Create a new key if needed"
echo "   - Make sure you have credits in your account"
echo ""

read_safe "Enter your OPENAI_API_KEY (this is critical!)" "OPENAI_API_KEY"

echo ""
echo "✅ Environment file created successfully!"
echo "📁 File: .env.local"
echo ""
echo "🔍 Verifying file contents..."
echo "=============================="
cat .env.local
echo "=============================="

echo ""
echo "🚀 Next steps:"
echo "1. Verify all values are correct above"
echo "2. Run: pkill -f 'next dev' && sleep 3 && npm run dev"
echo "3. Test the AI chat functionality"
echo ""
echo "💡 If you need to edit the file later:"
echo "   nano .env.local"
