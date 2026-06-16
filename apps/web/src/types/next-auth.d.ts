import type { DefaultSession } from "next-auth";

// Augment NextAuth's Session/JWT with the fields our callbacks set (see
// apps/web/src/lib/auth.ts). This removes the need for `@ts-expect-error` when
// reading `session.user.role` / `session.user.id` across the app.

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
