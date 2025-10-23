# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth for Avenai.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Avenai" and click "Create"

## Step 2: Enable Google+ API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click it and press "Enable"

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" user type (or "Internal" if using Google Workspace)
3. Click "Create"
4. Fill in the required fields:
   - **App name**: Avenai
   - **User support email**: your@email.com
   - **Developer contact email**: your@email.com
5. Click "Save and Continue"
6. Skip "Scopes" (click "Save and Continue")
7. Add test users (your email) if using External
8. Click "Save and Continue"

## Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Web application"
4. Name: "Avenai Web Client"
5. Add Authorized JavaScript origins:
   - `http://localhost:3000` (for development)
   - `https://avenai.io` (for production)
6. Add Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (for development)
   - `https://avenai.io/api/auth/callback/google` (for production)
7. Click "Create"

## Step 5: Copy Credentials to .env.local

You'll see a dialog with your Client ID and Client Secret.

Add these to your `.env.local`:

```bash
# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id-here.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret-here"
```

## Step 6: Restart Dev Server

```bash
# Stop the current dev server (Ctrl+C)
npm run dev
```

## Step 7: Test Google OAuth

1. Go to `http://localhost:3000/auth/signin`
2. You should now see the "Or continue with Google" section
3. Click the Google button
4. Sign in with your Google account
5. You'll be redirected to the dashboard

## Production Setup

For production deployment on Vercel/your hosting:

1. Add the same environment variables in your hosting dashboard:
   ```
   GOOGLE_CLIENT_ID=your-production-client-id
   GOOGLE_CLIENT_SECRET=your-production-client-secret
   NEXTAUTH_URL=https://avenai.io
   ```

2. Make sure your production domain is added to:
   - Authorized JavaScript origins: `https://avenai.io`
   - Authorized redirect URIs: `https://avenai.io/api/auth/callback/google`

## Troubleshooting

### "redirect_uri_mismatch" error
- Make sure the redirect URI in Google Console exactly matches: `http://localhost:3000/api/auth/callback/google`
- Check there are no trailing slashes
- Verify you're using the correct domain (localhost vs production)

### "client_id is required" error
- Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are in `.env.local`
- Restart your dev server after adding credentials
- Check for typos in environment variable names

### Google button doesn't appear
- The button only shows when Google OAuth is properly configured
- Check `/api/auth/providers` returns `{ google: {...} }`
- Verify environment variables are loaded

## Security Best Practices

1. **Never commit credentials** - Keep `.env.local` in `.gitignore`
2. **Use different credentials** for development and production
3. **Rotate secrets regularly** - especially if exposed
4. **Enable 2FA** on your Google Cloud account
5. **Monitor OAuth usage** in Google Cloud Console

## Alternative: Enterprise SSO

For enterprise customers who need SAML/OIDC with Okta, Azure AD, etc., see `docs/SSO_ROADMAP.md` for WorkOS integration plans.
