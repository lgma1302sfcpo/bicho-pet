import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import type { AuthenticatedUserDTO } from "@/dtos/identity/auth.dto";
import { loginSchema } from "@/schemas/identity/auth.schemas";
import { identityService } from "@/services/identity";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Email e senha",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        try {
          const user = await identityService.authenticate(parsed.data);
          return user as AuthenticatedUserDTO & { id: string };
        } catch {
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const identityUser = user as AuthenticatedUserDTO;

        token.userId = identityUser.id;
        token.name = identityUser.name;
        token.email = identityUser.email;
        token.currentTenantId = identityUser.currentTenantId;
        token.currentTenantName = identityUser.currentTenantName;
        token.currentBranchId = identityUser.currentBranchId;
        token.currentBranchName = identityUser.currentBranchName;
        token.roleId = identityUser.roleId;
        token.roleName = identityUser.roleName;
        token.permissions = identityUser.permissions;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.currentTenantId = token.currentTenantId as string;
        session.user.currentTenantName = token.currentTenantName as string;
        session.user.currentBranchId = token.currentBranchId as string | null | undefined;
        session.user.currentBranchName = token.currentBranchName as string | null | undefined;
        session.user.roleId = token.roleId as string;
        session.user.roleName = token.roleName as string;
        session.user.permissions = (token.permissions as string[]) ?? [];
      }

      return session;
    }
  }
};

export function getCurrentSession() {
  return getServerSession(authOptions);
}
