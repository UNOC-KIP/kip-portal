import type { NextAuthOptions } from "next-auth";
import type { Adapter, AdapterUser, AdapterAccount, AdapterSession } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import { compare } from "bcryptjs";
import {
  User,
  Account,
  Session,
  VerificationToken,
} from "@kip/db";

// ─── Sequelize-based NextAuth adapter ────────────────────────────────────────

function toAdapterUser(u: User): AdapterUser {
  return {
    id: u.id,
    email: u.email,
    emailVerified: u.emailVerified ?? null,
    name: u.name ?? null,
    role: u.role,
  } as AdapterUser & { role: string }
}

function SequelizeAdapter(): Adapter {
  return {
    async createUser(data: Omit<AdapterUser, 'id'>) {
      const user = await User.create({
        email: data.email,
        emailVerified: data.emailVerified ?? undefined,
        name: data.name ?? undefined,
      });
      return toAdapterUser(user);
    },

    async getUser(id) {
      const user = await User.findByPk(id);
      return user ? toAdapterUser(user) : null;
    },

    async getUserByEmail(email) {
      const user = await User.findOne({ where: { email } });
      return user ? toAdapterUser(user) : null;
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const account = await Account.findOne({
        where: { provider, providerAccountId },
        include: [{ model: User, as: "user" }],
      });
      if (!account) return null;
      const user = (account as Account & { user: User }).user;
      return user ? toAdapterUser(user) : null;
    },

    async updateUser({ id, ...data }) {
      await User.update(data, { where: { id } });
      const user = await User.findByPk(id);
      return toAdapterUser(user!);
    },

    async deleteUser(userId) {
      await User.destroy({ where: { id: userId } });
    },

    async linkAccount(data: AdapterAccount) {
      await Account.create({
        userId: data.userId,
        type: data.type,
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        refresh_token: data.refresh_token ?? undefined,
        access_token: data.access_token ?? undefined,
        expires_at: data.expires_at ?? undefined,
        token_type: data.token_type ?? undefined,
        scope: data.scope ?? undefined,
        id_token: data.id_token ?? undefined,
        session_state: data.session_state ? String(data.session_state) : undefined,
      });
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await Account.destroy({ where: { provider, providerAccountId } });
    },

    async createSession({ sessionToken, userId, expires }) {
      const s = await Session.create({ sessionToken, userId, expires });
      return { sessionToken: s.sessionToken, userId: s.userId, expires: s.expires };
    },

    async getSessionAndUser(sessionToken) {
      const session = await Session.findOne({
        where: { sessionToken },
        include: [{ model: User, as: "user" }],
      });
      if (!session) return null;
      const user = (session as Session & { user: User }).user;
      if (!user) return null;
      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires,
        } as AdapterSession,
        user: toAdapterUser(user),
      };
    },

    async updateSession({ sessionToken, expires }) {
      if (expires) await Session.update({ expires }, { where: { sessionToken } });
      const s = await Session.findOne({ where: { sessionToken } });
      if (!s) return null;
      return { sessionToken: s.sessionToken, userId: s.userId, expires: s.expires };
    },

    async deleteSession(sessionToken) {
      await Session.destroy({ where: { sessionToken } });
    },

    async createVerificationToken({ identifier, token, expires }) {
      await VerificationToken.create({ identifier, token, expires });
      return { identifier, token, expires };
    },

    async useVerificationToken({ identifier, token }) {
      const vt = await VerificationToken.findOne({ where: { identifier, token } });
      if (!vt) return null;
      await VerificationToken.destroy({ where: { identifier, token } });
      return { identifier: vt.identifier, token: vt.token, expires: vt.expires };
    },
  };
}

// ─── NextAuth config ──────────────────────────────────────────────────────────

// Cross-subdomain session cookie. In production the investor portal
// (kip.unoc.com) and the API (api.kip.unoc.com) are different subdomains, so the
// browser only sends the session cookie to the API if it carries
// Domain=.kip.unoc.com — set via COOKIE_DOMAIN. A distinct name per app keeps the
// admin and investor portals from clobbering each other's cookie on the shared
// parent domain. When COOKIE_DOMAIN is unset (local dev) the cookie stays
// host-only, as before.
const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith("https://") ?? false;
const sessionCookieName = `${useSecureCookies ? "__Secure-" : ""}kip-investor.session-token`;

export const authOptions: NextAuthOptions = {
  adapter: SequelizeAdapter(),
  cookies: {
    sessionToken: {
      name: sessionCookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
        domain: process.env.COOKIE_DOMAIN || undefined,
      },
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/sign-in",
    newUser: "/sign-up",
  },
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: process.env.EMAIL_SERVER_USER
          ? {
              user: process.env.EMAIL_SERVER_USER,
              pass: process.env.EMAIL_SERVER_PASSWORD,
            }
          : undefined,
      },
      from: process.env.EMAIL_FROM,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await User.findOne({ where: { email: credentials.email } });
        if (!user?.passwordHash) return null;

        if (user.status !== "ACTIVE") {
          throw new Error(
            user.status === "PENDING_REVIEW"
              ? "Your account is pending approval. You will receive your login credentials by email once our team approves your registration."
              : "Your account has not been approved. Please contact support for assistance.",
          );
        }

        // Block staff accounts — they must use the admin portal
        if (user.role && user.role !== "INVESTOR") {
          throw new Error("Staff accounts must sign in at the admin portal.");
        }

        const ok = await compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const role = (user as { role?: string }).role;
        if (role) {
          token.role = role;
        } else {
          const dbUser = await User.findByPk(user.id as string);
          token.role = dbUser?.role ?? "INVESTOR";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-expect-error — extending session user
        session.user.id = token.id;
        // @ts-expect-error — extending session user
        session.user.role = token.role;
      }
      return session;
    },
  },
};
