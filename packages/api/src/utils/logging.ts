import type { WithPosthogUserCtx } from "./shared-args.types";

export type CapturePosthogForUserInput = {
  event: string;
  properties?: Record<string, unknown>;
};

/** PostHog capture with `distinctId` always set to the authenticated user id. */
export async function capturePosthogForUser(
  args: WithPosthogUserCtx<CapturePosthogForUserInput>,
): Promise<void> {
  const { ctx, input } = args;
  await ctx.posthog.captureImmediate({
    distinctId: ctx.userId,
    event: input.event,
    properties: input.properties ?? {},
  });
}
