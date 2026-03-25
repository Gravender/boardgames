import type { PostHog } from "posthog-node";

import type { TransactionType } from "@board-games/db/client";

export type { TransactionType };

// ─── Transaction (Drizzle) ───────────────────────────────────────────────────

/** Optional Drizzle transaction on repository / nested operations. */
export type WithOptionalTx = {
  tx?: TransactionType;
};

/** Required transaction (e.g. nested transaction). */
export type WithRequiredTx = {
  tx: TransactionType;
};

/** Alias for {@link WithOptionalTx} (e.g. `BaseServiceArgs & WithTx`). */
export type WithTx = WithOptionalTx;

// ─── Repository-style args ───────────────────────────────────────────────────

/** Repository: `{ input, tx? }` without user scope. */
export type WithTxInput<TInput> = {
  input: TInput;
} & WithOptionalTx;

/** Repository: `{ userId, input, tx? }`. */
export type WithRepoUserIdInput<TInput> = {
  userId: string;
  input: TInput;
} & WithOptionalTx;

/** Repository: `{ createdBy, input, tx? }`. */
export type WithCreatedByInput<TInput> = {
  createdBy: string;
  input: TInput;
} & WithOptionalTx;

/** Repository: `{ userId, input }` without optional transaction. */
export type UserScopedInput<TInput> = {
  userId: string;
  input: TInput;
};

/** Repository: `{ userId, input, tx }` — transaction required. */
export type WithRepoUserIdInputRequiredTx<TInput> = {
  userId: string;
  input: TInput;
} & WithRequiredTx;

/** Flat owner scope + optional transaction (no nested `input`). */
export type WithCreatedByTx<TExtra = object> = {
  createdBy: string;
} & WithOptionalTx &
  TExtra;

/** Back-compat: same as {@link WithTxInput}. */
export type BaseRepoArgs<TInput> = WithTxInput<TInput>;

/** Back-compat: same as {@link UserScopedInput}. */
export type UserScopedArgs<TInput> = UserScopedInput<TInput>;

// ─── Service-style `ctx` + `input` ─────────────────────────────────────────

/** tRPC-style `ctx` with authenticated user id. */
export type UserIdCtx = {
  userId: string;
};

/** `ctx` with PostHog (analytics) for procedures that emit events. */
export type PosthogUserCtx = UserIdCtx & {
  posthog: PostHog;
};

/** Service procedure: `{ ctx: { userId }, input }`. */
export type WithUserIdCtx<TInput> = {
  ctx: UserIdCtx;
  input: TInput;
};

/** Service procedure: `{ ctx: { userId, posthog }, input }`. */
export type WithPosthogUserCtx<TInput> = {
  ctx: PosthogUserCtx;
  input: TInput;
};

/**
 * Generic service procedure shape: `{ ctx, input }`.
 * Use when `ctx` is not exactly {@link UserIdCtx} or {@link PosthogUserCtx}.
 */
export type WithServiceCtx<TCtx, TInput> = {
  ctx: TCtx;
  input: TInput;
};

/**
 * Service procedure with `ctx: { userId, posthog }` (common protected mutations).
 * Same shape as {@link WithPosthogUserCtx}.
 */
export type BaseServiceArgs<TInput> = WithPosthogUserCtx<TInput>;

/** Service query with no `input` (only `ctx` with `userId`). */
export type WithUserIdCtxOnly = {
  ctx: UserIdCtx;
};
