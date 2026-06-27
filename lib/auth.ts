import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

// Better Auth server instance. Identity comes from GitHub; the OAuth access
// token is persisted on the `Account` row so we can read the user's repos.
//
// `db` is our Prisma 7 driver-adapter client (generated to lib/generated/prisma),
// which is what the Better Auth Prisma-7 docs require when a custom output is set.
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      // Scopes are ignored by GitHub Apps (access is governed by install +
      // permissions), but harmless for OAuth-app mode.
      scope: ["read:user", "user:email", "repo"],
      // GitHub Apps often can't read the user's email (needs the "Email
      // addresses" permission + re-consent). Fall back to GitHub's stable
      // noreply address so we always have a unique email for the User row.
      mapProfileToUser: (profile) => ({
        email:
          profile.email ??
          `${profile.id}+${profile.login}@users.noreply.github.com`,
        name: profile.name ?? profile.login,
      }),
    },
  },
});

export type Session = typeof auth.$Infer.Session;
