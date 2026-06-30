import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createServerSupabase } from "@/lib/supabase";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email) return false;
      // Check if admin override
      const admins = (process.env.INITIAL_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
      if (admins.includes(profile.email)) return true;
      // Check if user exists in app_users
      const sb = createServerSupabase();
      const { data } = await sb.from("app_users").select("id").eq("email", profile.email).single();
      if (data) return true;
      // Auto-create as reporter
      await sb.from("app_users").upsert({ email: profile.email, name: profile.name ?? "", role: "reporter" });
      return true;
    },
    async jwt({ token, profile }) {
      if (profile?.email) {
        const admins = (process.env.INITIAL_ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
        if (admins.includes(profile.email)) {
          token.role = "admin";
          token.userName = profile.name ?? "";
        } else {
          const sb = createServerSupabase();
          const { data } = await sb.from("app_users").select("role, name").eq("email", profile.email).single();
          token.role = data?.role ?? "reporter";
          token.userName = data?.name ?? profile.name ?? "";
        }
        // Update last_login
        const sb = createServerSupabase();
        await sb.from("app_users").update({ last_login: new Date().toISOString() }).eq("email", profile.email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string; userName?: string }).role = token.role as string;
        (session.user as { role?: string; userName?: string }).userName = token.userName as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
