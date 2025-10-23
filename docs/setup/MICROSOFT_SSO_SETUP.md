# Microsoft SSO Setup Guide

## Overview

Avenai now supports Microsoft Single Sign-On (SSO) through Azure Active Directory. This provides enterprise users with seamless authentication using their Microsoft work accounts.

## Setup Instructions

### 1. Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **"New registration"**
4. Fill in the details:
   - **Name**: "Avenai Production" (or your preferred name)
   - **Redirect URI**: Choose **"Web"** and enter: `https://your-domain.com/api/auth/callback/azure-ad`
   - Click **"Register"**

### 2. Configure Authentication

1. In your app registration, go to **Authentication**
2. Click **"Add a platform"** → **"Web"**
3. Add these redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/azure-ad`
   - Production: `https://your-domain.com/api/auth/callback/azure-ad`
4. Under **"Implicit grant and hybrid flows"**, check:
   - ☑️ ID tokens
   - ☑️ Access tokens
5. Click **"Save"**

### 3. API Permissions

1. Go to **API permissions**
2. Click **"Add a permission"**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these permissions:
   - `openid`
   - `profile`
   - `email`
   - `User.Read`
6. Click **"Add permissions"**
7. Click **"Grant admin consent for [Your Organization]"** (if applicable)

### 4. Get Credentials

1. Go to **Overview** in your app registration
2. Copy these values:
   - **Application (client) ID**
   - **Directory (tenant) ID**
3. Go to **Certificates & secrets**
4. Click **"New client secret"**
5. Add description: "Avenai Production Secret"
6. Choose expiration (recommend 24 months)
7. Copy the **Value** (this is your client secret)

### 5. Environment Configuration

Add these to your `.env.local` file:

```bash
# Microsoft SSO (Azure AD)
AZURE_AD_CLIENT_ID="your-application-client-id"
AZURE_AD_CLIENT_SECRET="your-client-secret"
AZURE_AD_TENANT_ID="your-tenant-id"  # Use "common" for multi-tenant
```

### 6. Tenant Configuration (Optional)

- **Single Tenant**: Use your specific tenant ID (found in Azure AD overview)
- **Multi-Tenant**: Use `"common"` to allow any Microsoft account
- **Organizational**: Use `"organizations"` for Microsoft work accounts only

## User Experience

### First-Time User
1. Click **"Continue with Microsoft"**
2. Sign in with Microsoft account
3. Redirected to **Onboarding Wizard**
4. Complete setup → Dashboard

### Returning User  
1. Click **"Continue with Microsoft"**
2. Sign in with Microsoft account  
3. Redirected directly to **Dashboard**

## Testing

### Local Development
```bash
# Start with Microsoft SSO available
npm run dev
# Visit http://localhost:3000/auth/signin
# Should see "Continue with Microsoft" button
```

### Production Testing
1. Deploy with environment variables configured
2. Test Microsoft sign-in flow
3. Verify onboarding → dashboard navigation
4. Test sign-out functionality

## Troubleshooting

### Common Issues

**"Client secret not found"**
- Verify `AZURE_AD_CLIENT_SECRET` is set correctly
- Check secret hasn't expired in Azure AD

**"Invalid client"**  
- Verify `AZURE_AD_CLIENT_ID` matches Azure app registration
- Ensure redirect URI includes your domain

**"Access denied"**
- Check user has access to your Azure AD tenant
- Verify API permissions are granted

**Sign-in buttons not showing**
- Providers detected automatically based on environment variables
- Check network requests to `/api/auth/providers` endpoint

### Debug Mode

Enable NextAuth debug mode in development:
```bash
DEBUG_ENABLED=true npm run dev
```

This will show detailed authentication logs in your console.
