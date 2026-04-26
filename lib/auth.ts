import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import User from "@/lib/models/User";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Admin login",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";

        if (!email || !password) return null;

        await dbConnect();

        let user = await User.findOne({ email });
        const envAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
        const envAdminHash = process.env.ADMIN_PASSWORD_HASH;

        if (!user && email === envAdminEmail && envAdminHash) {
          user = await User.create({
            email,
            passwordHash: envAdminHash,
            name: "Administrator",
            role: "admin"
          });
        }

        if (!user) return null;

        let valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid && email === envAdminEmail && envAdminHash) {
          valid = await bcrypt.compare(password, envAdminHash);
          if (valid && user.passwordHash !== envAdminHash) {
            user.passwordHash = envAdminHash;
            await user.save();
          }
        }

        if (!valid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  }
};
