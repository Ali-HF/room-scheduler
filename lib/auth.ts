import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/crypto";
import type { NextAuthOptions } from "next-auth";
import type { Adapter, AdapterAccount } from "next-auth/adapters";

/**
 * Custom Prisma Adapter wrapper that ensures any OAuth tokens
 * (access_token, refresh_token, id_token) are encrypted with AES-256-GCM
 * before being saved to PostgreSQL, and decrypted upon return.
 */
function EncryptedPrismaAdapter(p: typeof prisma): Adapter {
  const defaultAdapter = PrismaAdapter(p);

  return {
    ...defaultAdapter,
    linkAccount: async (account: AdapterAccount) => {
      // Google OAuth returns refresh_token_expires_in which is not in the Prisma schema
      const { refresh_token_expires_in, ...validAccount } = account as AdapterAccount & { refresh_token_expires_in?: number };

      const encryptedAccount = {
        ...validAccount,
        access_token: encryptToken(validAccount.access_token),
        refresh_token: encryptToken(validAccount.refresh_token),
        id_token: encryptToken(validAccount.id_token),
      };

      const result = await defaultAdapter.linkAccount!(encryptedAccount);
      if (!result) return result;

      return {
        ...result,
        access_token: decryptToken(result.access_token),
        refresh_token: decryptToken(result.refresh_token),
        id_token: decryptToken(result.id_token),
      };
    },
  };
}

export const authOptions: NextAuthOptions = {
  adapter: EncryptedPrismaAdapter(prisma),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account && account.provider === "google") {
        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
        });

        if (existingAccount) {
          await prisma.account.update({
            where: { id: existingAccount.id },
            data: {
              access_token: account.access_token
                ? encryptToken(account.access_token)
                : existingAccount.access_token,
              refresh_token: account.refresh_token
                ? encryptToken(account.refresh_token)
                : existingAccount.refresh_token,
              expires_at: account.expires_at ?? existingAccount.expires_at,
              scope: account.scope ?? existingAccount.scope,
              id_token: account.id_token
                ? encryptToken(account.id_token)
                : existingAccount.id_token,
            },
          });
        }
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
  },

  useSecureCookies: process.env.NODE_ENV === "production",
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
