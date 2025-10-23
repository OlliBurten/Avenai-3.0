#!/bin/bash

# Microsoft SSO Setup Script for Avenai
# This script helps you configure Azure AD for Microsoft authentication

echo "🔐 Microsoft SSO Setup for Avenai"
echo "=================================="

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    echo ""
    echo "After installation, run: az login"
    exit 1
fi

# Check if user is logged into Azure
if ! az account show &> /dev/null; then
    echo "❌ You need to log into Azure first. Run: az login"
    exit 1
fi

echo "✅ Azure CLI is installed and you're logged in"
echo ""

# Get current tenant info
TENANT_ID=$(az account show --query tenantId -o tsv)
TENANT_NAME=$(az account show --query name -o tsv)

echo "📋 Current Azure Tenant:"
echo "   Tenant ID: $TENANT_ID"
echo "   Tenant Name: $TENANT_NAME"
echo ""

# Ask for app name
read -p "Enter app registration name (e.g., 'Avenai Production'): " APP_NAME

if [ -z "$APP_NAME" ]; then
    echo "❌ App name is required"
    exit 1
fi

# Generate redirect URIs
DEV_REDIRECT="http://localhost:3000/api/auth/callback/azure-ad"
PROD_REDIRECT="https://your-domain.com/api/auth/callback/azure-ad"

echo "🚀 Creating Azure AD App Registration..."
echo "   App Name: $APP_NAME"
echo "   Redirect URIs:"
echo "     - Development: $DEV_REDIRECT"
echo "     - Production: $PROD_REDIRECT"
echo ""

# Create the app registration
APP_ID=$(az ad app create \
    --display-name "$APP_NAME" \
    --web-redirect-uris "$DEV_REDIRECT" "$PROD_REDIRECT" \
    --enable-id-token-issuance true \
    --query appId -o tsv)

if [ $? -eq 0 ]; then
    echo "✅ App registration created successfully!"
    echo "   Application (Client) ID: $APP_ID"
else
    echo "❌ Failed to create app registration"
    exit 1
fi

# Create a client secret
echo ""
echo "🔑 Creating client secret..."
SECRET_ID=$(az ad app credential reset --id "$APP_ID" --query password -o tsv)
SECRET_VALUE=$(az ad app credential reset --id "$APP_ID" --query password -o tsv)

if [ $? -eq 0 ]; then
    echo "✅ Client secret created!"
else
    echo "❌ Failed to create client secret"
    exit 1
fi

echo ""
echo "📝 Environment Variables for .env.local:"
echo "=========================================="
echo "AZURE_AD_CLIENT_ID=\"$APP_ID\""
echo "AZURE_AD_CLIENT_SECRET=\"$SECRET_VALUE\""
echo "AZURE_AD_TENANT_ID=\"$TENANT_ID\""
echo ""

echo "🔧 Next Steps:"
echo "================"
echo "1. Copy the environment variables above to your .env.local file"
echo "2. Update the production redirect URI in Azure AD dashboard"
echo "3. Test the sign-in flow: npm run dev"
echo "4. Visit: http://localhost:3000/auth/signin"
echo ""

echo "📚 Additional Configuration:"
echo "============================"
echo "1. Go to Azure Portal: https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/$APP_ID"
echo "2. In 'API permissions': Add 'Microsoft Graph' permissions:"
echo "   - User.Read"
echo "   - email"
echo "   - openid"
echo "   - profile"
echo "3. Click 'Grant admin consent' if you're an admin"
echo ""

echo "✅ Microsoft SSO setup complete!"
echo ""
echo "🚨 IMPORTANT: Save the client secret securely - you won't be able to retrieve it again!"
echo "💡 For production, update the redirect URI to your actual domain"
