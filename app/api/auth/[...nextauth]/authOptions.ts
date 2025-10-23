// app/api/auth/[...nextauth]/authOptions.ts
// Main auth options with development fallback

import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";

// Check if we have OAuth credentials
const hasGoogleCredentials = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const hasAzureCredentials = !!(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  providers: [
    // Only add providers if credentials are available
    ...(hasGoogleCredentials ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      })
    ] : []),
    ...(hasAzureCredentials ? [
      AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID!,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        tenantId: process.env.AZURE_AD_TENANT_ID || "common",
      })
    ] : []),
  ],
  session: { 
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      console.log('[NextAuth][signIn] Development mode - allowing all sign-ins:', { 
        email: user?.email, 
        provider: account?.provider 
      });
      
      // Allow all sign-ins in development
      return true;
    },
    async session({ session, user }) {
      if (user) {
        session.user.id = user.id;
        (session.user as any).organizationId = (user as any).organizationId || 'dev-org-123';
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log('[NextAuth][redirect]', { url, baseUrl });
      // Always redirect to dashboard after successful sign-in
      return `${baseUrl}/dashboard`;
    },
  },
  debug: true,
};
