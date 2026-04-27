import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import React from "react";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, oAuthProxy, username } from "better-auth/plugins";
import { Resend } from "resend";

import { db } from "@board-games/db/client";
import * as schema from "@board-games/db/schema";

import { authEnv } from "../env";
import { EmailTemplate } from "./email-templates";

const env = authEnv();

const resend = new Resend(env.RESEND_API_KEY);

type PlayerCandidate = {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

const resolvePlayerName = (u: PlayerCandidate) =>
  (
    u.name?.trim() ||
    u.username?.trim() ||
    u.email?.split("@")[0]?.trim() ||
    "Player"
  ).slice(0, 256);

const ensureUserPlayer = async (u: PlayerCandidate) => {
  try {
    const existing = await db.query.player.findFirst({
      where: {
        createdBy: u.id,
        isUser: true,
        deletedAt: { isNull: true },
      },
      columns: { id: true },
    });
    if (existing) return;

    await db
      .insert(schema.player)
      .values({
        createdBy: u.id,
        name: resolvePlayerName(u),
        isUser: true,
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error("ensureUserPlayer failed", { userId: u.id, error });
  }
};

export function initAuth<
  TExtraPlugins extends BetterAuthPlugin[] = [],
>(options: {
  baseUrl: string;
  productionUrl: string;
  secret: string | undefined;

  githubClientId: string;
  githubClientSecret: string;
  googleClientId: string;
  googleClientSecret: string;

  extraPlugins?: TExtraPlugins;
}) {
  const config = {
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        ...schema,
        user: schema.user,
        account: schema.account,
        verification: schema.verification,
        session: schema.session,
      },
    }),
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        const name = user.name || user.email.split("@")[0];

        await resend.emails.send({
          from: "no-reply@boardgamestats.net",
          to: user.email,
          subject: "Reset your password",
          react: EmailTemplate({
            heading: "Reset your password",
            content: React.createElement(
              React.Fragment,
              null,
              React.createElement("p", null, `Hi ${name},`),
              React.createElement(
                "p",
                null,
                "Someone requested a password reset for your account. If this was you, ",
                "click the button below to reset your password.",
              ),
              React.createElement(
                "p",
                null,
                "If you didn't request this, you can safely ignore this email.",
              ),
            ),
            action: "Reset Password",
            url,
            baseUrl: options.baseUrl,
          }),
        });
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        const newSession = ctx.context.newSession;
        if (!newSession) return;

        const user = newSession.user;
        await ensureUserPlayer({
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
        });
      }),
    },
    baseURL: options.baseUrl,
    secret: options.secret,
    plugins: [
      oAuthProxy({
        productionURL: options.productionUrl,
      }) as BetterAuthPlugin,
      expo(),
      username(),
      admin(),
      ...(options.extraPlugins ?? []),
    ],
    socialProviders: {
      github: {
        clientId: options.githubClientId,
        clientSecret: options.githubClientSecret,
        redirectURI: `${options.productionUrl}/api/auth/callback/github`,
      },
      google: {
        clientId: options.googleClientId,
        clientSecret: options.googleClientSecret,
        redirectURI: `${options.productionUrl}/api/auth/callback/google`,
      },
    },
    trustedOrigins: ["expo://"],
    onAPIError: {
      onError(error, ctx) {
        console.error("BETTER AUTH API ERROR", error, ctx);
      },
    },
  } satisfies BetterAuthOptions;

  return betterAuth(config);
}

export type Auth = ReturnType<typeof initAuth>;
export type Session = Auth["$Infer"]["Session"];
