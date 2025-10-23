import NextAuth from "next-auth"
import { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      organizationId: string | null
      role: UserRole
      onboardingCompleted: boolean
    }
    orgOnboarded: boolean
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string
    orgId: string | null
    organizationId: string | null
    orgOnboarded: boolean
    onboardingCompleted: boolean
    orgOnboardingCompleted: boolean
    role: UserRole
  }
}
