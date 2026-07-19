import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./db";

/**
 * Auth.js (v5) configuration.
 *  - Google OAuth when AUTH_GOOGLE_ID/SECRET are set.
 *  - Email magic links when EMAIL_SERVER is set.
 *  - A dev-only credentials provider (email, no password) so the app is
 *    usable with ZERO keys during local development.
 */
const providers: NextAuthConfig["providers"] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

if (process.env.EMAIL_SERVER) {
  providers.push(
    Nodemailer({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  );
}

// Dev fallback: sign in by email only. Never enabled in production.
if (process.env.NODE_ENV !== "production") {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev (email only)",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        if (!email || !email.includes("@")) return null;
        const user = await prisma.user.upsert({
          where: { email },
          create: { email, name: email.split("@")[0], credits: 25 },
          update: {},
        });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  );
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
