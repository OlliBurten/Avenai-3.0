import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  // Clear all NextAuth cookies
  const cookieStore = await cookies();
  
  // Delete NextAuth session cookie
  cookieStore.delete('next-auth.session-token');
  cookieStore.delete('__Secure-next-auth.session-token');
  
  // Delete our bypass cookie
  cookieStore.delete('av_onb');
  
  // Redirect to sign-in page
  return NextResponse.redirect(new URL('/auth/signin', process.env.NEXTAUTH_URL || 'http://localhost:3000'));
}


