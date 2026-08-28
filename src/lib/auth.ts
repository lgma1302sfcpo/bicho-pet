import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import type { AuthenticatedUserDTO } from "@/dtos/identity/auth.dto";
import { loginSchema } from "@/schemas/identity/auth.schemas";
import { prisma } from "@/lib/prisma";
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
      name: "Usuário/e-mail e senha",
      credentials: {
        identifier: { label: "Usuário ou e-mail", type: "text" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse({
          ...credentials,
          identifier: credentials?.identifier || (credentials as Record<string, string> | undefined)?.email
        });

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
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const identityUser = user as AuthenticatedUserDTO;

        token.userId = identityUser.id;
        token.name = identityUser.name;
        token.email = identityUser.email;
        token.currentTenantId = identityUser.currentTenantId;
        token.currentTenantName = identityUser.currentTenantName;
        token.currentBranchId = identityUser.currentBranchId;
        token.currentBranchName = identityUser.currentBranchName;
        token.canAccessAllBranches = identityUser.canAccessAllBranches;
        token.roleId = identityUser.roleId;
        token.roleName = identityUser.roleName;
        token.permissions = identityUser.permissions;
      }

      if (trigger === "update" && token.currentTenantId) {
        const requestedBranchId = typeof session?.currentBranchId === "string" && session.currentBranchId
          ? session.currentBranchId
          : null;

        if (token.canAccessAllBranches && requestedBranchId === null) {
          token.currentBranchId = null;
          token.currentBranchName = "Todas as lojas";
        } else if (requestedBranchId) {
          const allowedBranch = await prisma.branch.findFirst({
            where: {
              id: requestedBranchId,
              tenantId: token.currentTenantId,
              status: "ACTIVE",
              ...(token.canAccessAllBranches
                ? {}
                : { memberships: { some: { userId: token.userId, isActive: true } } })
            },
            select: { id: true, name: true }
          });

          if (allowedBranch) {
            token.currentBranchId = allowedBranch.id;
            token.currentBranchName = allowedBranch.name;
          }
        }
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
        session.user.canAccessAllBranches = Boolean(token.canAccessAllBranches);
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
