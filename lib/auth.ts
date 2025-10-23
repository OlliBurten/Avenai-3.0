import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { getServerSession } from 'next-auth'
import type { GetServerSidePropsContext } from 'next'

export { authOptions };

export function auth(...args: [GetServerSidePropsContext["req"], GetServerSidePropsContext["res"]] | []) {
  return getServerSession(...args, authOptions);
}

export const getSession = auth;