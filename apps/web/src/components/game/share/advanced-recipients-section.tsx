"use client";

import { ChevronDown, MapPin, Users } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@board-games/ui/collapsible";
import { Label } from "@board-games/ui/label";
import { Switch } from "@board-games/ui/switch";

import { useFormContext } from "~/hooks/form";

import { useShareGameData } from "./share-game-data-context";
import {
  getShareMatchList,
  locationDisplayNameForPermissionKey,
  locationPermissionKeyForMatch,
  mockMatchIdKey,
  scoresheetPlayersFromPreview,
} from "./share-preview";
import { PERMISSION_SECTION_INTRO } from "./share-permission-copy";
import { SharePlayerMismatchBadge } from "./share-player-mismatch-badge";
import { SharePermissionTierToggle } from "./share-permission-tier-toggle";
import { deriveMatchPlayerWithoutPlayerIssues } from "./share-summary-derive";
import { PermissionViewEditHints } from "./share-permission-view-edit-hints";
import {
  PlayerSharePermissionSelect,
  SharePermissionSelect,
} from "./share-permission-select";
import {
  applyAdvancedBulkPermission,
  computeAdvancedBulkTier,
  type ShareGameForm,
} from "./use-share-game-form";
import type {
  FriendRow,
  GameData,
  Permission,
  ShareGameFormValues,
} from "./types";

const includedMatchRows = (
  matches: ShareGameFormValues["matches"],
  gameData: GameData,
) =>
  getShareMatchList(gameData).filter(
    (m) => matches[mockMatchIdKey(m.id)]?.included,
  );

const includedLocationEntries = (
  matches: ShareGameFormValues["matches"],
  gameData: GameData,
): { key: string; label: string }[] => {
  const byKey = new Map<string, string>();
  for (const m of getShareMatchList(gameData)) {
    const matchKey = mockMatchIdKey(m.id);
    const row = matches[matchKey];
    if (row?.included && row.includeLocation) {
      const locKey = locationPermissionKeyForMatch(m);
      if (locKey) {
        byKey.set(
          locKey,
          locationDisplayNameForPermissionKey(locKey, gameData),
        );
      }
    }
  }
  return [...byKey.entries()]
    .map(([key, label]) => ({ key, label }))
    .toSorted((a, b) => a.label.localeCompare(b.label));
};

const PermLabeledRow = ({
  label,
  description,
  id,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  id: string;
  value: Permission;
  onChange: (p: Permission) => void;
}) => (
  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/60 py-2 last:border-0">
    <div className="min-w-0 flex-1">
      <p className="text-foreground text-xs font-medium">{label}</p>
      {description ? (
        <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
          {description}
        </p>
      ) : null}
    </div>
    <SharePermissionSelect
      id={id}
      value={value}
      onValueChange={onChange}
      className="self-start"
      aria-label={`${label} permission`}
    />
  </div>
);

type AdvancedRecipientsSectionProps = {
  friends: FriendRow[];
};

export const AdvancedRecipientsSection = ({
  friends,
}: AdvancedRecipientsSectionProps) => {
  const form = useFormContext() as unknown as ShareGameForm;
  const gameData = useShareGameData();

  return (
    <form.Subscribe
      selector={(s) => ({
        recipients: s.values.recipients,
        shareOptions: s.values.shareOptions,
        matches: s.values.matches,
        roleInclusion: s.values.roleInclusion,
        scoresheetInclusion: s.values.scoresheetInclusion,
        formValues: s.values,
      })}
    >
      {({
        recipients,
        shareOptions,
        matches,
        roleInclusion,
        scoresheetInclusion,
        formValues,
      }) => {
        const mismatchIssues = deriveMatchPlayerWithoutPlayerIssues(
          formValues,
          gameData,
        );
        const mismatchPlayerIdsByUser = new Map(
          mismatchIssues.map((i) => [i.userId, new Set(i.playerIds)]),
        );

        return (
          <div className="space-y-4">
            {recipients.map((rec) => {
              const user = friends.find((u) => u.id === rec.userId);
              const playerMismatchSet =
                mismatchPlayerIdsByUser.get(rec.userId) ?? null;
              const hasRecipientMismatch =
                playerMismatchSet !== null && playerMismatchSet.size > 0;
              return (
                <form.Subscribe
                  key={rec.userId}
                  selector={(s) => {
                    const adv = s.values.advancedPerUser[rec.userId];
                    const visible = adv?.permissionsVisible ?? true;
                    return { adv, visible };
                  }}
                >
                  {({ adv, visible }) => {
                    if (!adv) return null;

                    const patch = (next: typeof adv) => {
                      form.setFieldValue("advancedPerUser", {
                        ...form.state.values.advancedPerUser,
                        [rec.userId]: next,
                      });
                    };

                    const matchRows = includedMatchRows(matches, gameData);
                    const locEntries = includedLocationEntries(
                      matches,
                      gameData,
                    );

                    return (
                      <div
                        key={rec.userId}
                        className="space-y-3 rounded-lg border border-border bg-muted/20 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <p className="font-medium">
                              {user?.name ?? rec.userId}
                            </p>
                            {hasRecipientMismatch ? (
                              <SharePlayerMismatchBadge />
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={`perm-vis-${rec.userId}`}
                              className="text-muted-foreground text-xs font-normal"
                            >
                              Show permissions
                            </Label>
                            <Switch
                              id={`perm-vis-${rec.userId}`}
                              checked={visible}
                              onCheckedChange={(c) => {
                                patch({ ...adv, permissionsVisible: c });
                              }}
                            />
                          </div>
                        </div>

                        {!visible ? (
                          <p className="text-muted-foreground border-t border-border pt-3 text-xs">
                            Permissions hidden for this user.
                          </p>
                        ) : (
                          <div className="space-y-4 border-t border-border pt-3">
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border/70 bg-muted/15 px-3 py-2.5">
                              <div className="min-w-0 flex-1">
                                <p className="text-foreground text-xs font-medium">
                                  All shared areas
                                </p>
                                <p className="text-muted-foreground text-[11px] leading-snug">
                                  Set View or Edit for every permission below at
                                  once.
                                  {computeAdvancedBulkTier(
                                    adv,
                                    form.state.values,
                                    gameData,
                                  ) === "mixed"
                                    ? " Some rows differ — pick View or Edit to align them."
                                    : null}
                                </p>
                              </div>
                              <SharePermissionTierToggle
                                value={computeAdvancedBulkTier(
                                  adv,
                                  form.state.values,
                                  gameData,
                                )}
                                onValueChange={(p) =>
                                  applyAdvancedBulkPermission(
                                    form,
                                    rec.userId,
                                    p,
                                    gameData,
                                  )
                                }
                                aria-label={`Set all permissions for ${user?.name ?? rec.userId}`}
                              />
                            </div>

                            <section className="space-y-2">
                              <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                                Game
                              </p>
                              <PermissionViewEditHints
                                viewHint={PERMISSION_SECTION_INTRO.game.view}
                                editHint={PERMISSION_SECTION_INTRO.game.edit}
                              />
                              <div className="rounded-lg border border-border/70 bg-background/50 p-2">
                                <PermLabeledRow
                                  label="Game"
                                  description="Access to this game’s details."
                                  id={`game-${rec.userId}`}
                                  value={adv.game}
                                  onChange={(v) => patch({ ...adv, game: v })}
                                />
                              </div>
                            </section>

                            {shareOptions.roles ? (
                              <section className="space-y-2">
                                <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                                  Roles
                                </p>
                                <PermissionViewEditHints
                                  viewHint={PERMISSION_SECTION_INTRO.roles.view}
                                  editHint={PERMISSION_SECTION_INTRO.roles.edit}
                                />
                                <div className="rounded-lg border border-border/70 bg-background/50 p-2">
                                  {gameData.gameRoles
                                    .filter((r) => roleInclusion[String(r.id)])
                                    .map((role) => (
                                      <PermLabeledRow
                                        key={role.id}
                                        label={role.name}
                                        id={`role-${rec.userId}-${role.id}`}
                                        value={
                                          adv.rolePermissions[
                                            String(role.id)
                                          ] ?? "view"
                                        }
                                        onChange={(v) =>
                                          patch({
                                            ...adv,
                                            rolePermissions: {
                                              ...adv.rolePermissions,
                                              [String(role.id)]: v,
                                            },
                                          })
                                        }
                                      />
                                    ))}
                                  {gameData.gameRoles.every(
                                    (r) => !roleInclusion[String(r.id)],
                                  ) ? (
                                    <p className="text-muted-foreground px-1 py-2 text-xs">
                                      No roles selected to share.
                                    </p>
                                  ) : null}
                                </div>
                              </section>
                            ) : null}

                            {shareOptions.scoresheets ? (
                              <section className="space-y-2">
                                <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                                  Scoresheets
                                </p>
                                <PermissionViewEditHints
                                  viewHint={
                                    PERMISSION_SECTION_INTRO.scoresheets.view
                                  }
                                  editHint={
                                    PERMISSION_SECTION_INTRO.scoresheets.edit
                                  }
                                />
                                <div className="rounded-lg border border-border/70 bg-background/50 p-2">
                                  {gameData.scoresheets
                                    .filter(
                                      (s) => scoresheetInclusion[String(s.id)],
                                    )
                                    .map((sheet) => (
                                      <PermLabeledRow
                                        key={sheet.id}
                                        label={sheet.name}
                                        id={`ss-${rec.userId}-${sheet.id}`}
                                        value={
                                          adv.scoresheetPermissions[
                                            String(sheet.id)
                                          ] ?? "view"
                                        }
                                        onChange={(v) =>
                                          patch({
                                            ...adv,
                                            scoresheetPermissions: {
                                              ...adv.scoresheetPermissions,
                                              [String(sheet.id)]: v,
                                            },
                                          })
                                        }
                                      />
                                    ))}
                                  {gameData.scoresheets.every(
                                    (s) => !scoresheetInclusion[String(s.id)],
                                  ) ? (
                                    <p className="text-muted-foreground px-1 py-2 text-xs">
                                      No scoresheets selected to share.
                                    </p>
                                  ) : null}
                                </div>
                              </section>
                            ) : null}

                            {shareOptions.matches ? (
                              <>
                                <section className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-muted-foreground flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase">
                                      <Users className="size-3" aria-hidden />
                                      Matches
                                    </p>
                                    {hasRecipientMismatch ? (
                                      <SharePlayerMismatchBadge />
                                    ) : null}
                                  </div>
                                  <PermissionViewEditHints
                                    viewHint={
                                      PERMISSION_SECTION_INTRO.matches.view
                                    }
                                    editHint={
                                      PERMISSION_SECTION_INTRO.matches.edit
                                    }
                                  />
                                  <div className="space-y-3 rounded-lg border border-border/70 bg-background/50 p-2">
                                    {matchRows.length === 0 ? (
                                      <p className="text-muted-foreground px-1 py-2 text-xs">
                                        No matches selected to share.
                                      </p>
                                    ) : (
                                      matchRows.map((m) => {
                                        const key = mockMatchIdKey(m.id);
                                        const dateLabel =
                                          new Intl.DateTimeFormat(undefined, {
                                            dateStyle: "medium",
                                          }).format(m.date);
                                        const sync =
                                          adv.matchPlayerSyncWithMatch[key] ??
                                          true;
                                        const matchHasPlayerMismatch =
                                          Boolean(playerMismatchSet) &&
                                          m.players.some((pl) =>
                                            playerMismatchSet?.has(
                                              String(pl.playerId),
                                            ),
                                          );
                                        return (
                                          <div
                                            key={key}
                                            className="border-border/60 bg-background/40 rounded-lg border px-2 py-2"
                                          >
                                            <PermLabeledRow
                                              label={m.name}
                                              description={dateLabel}
                                              id={`match-${rec.userId}-${key}`}
                                              value={
                                                adv.matchPermissions[key] ??
                                                "view"
                                              }
                                              onChange={(v) => {
                                                const nextMatchPerms = {
                                                  ...adv.matchPermissions,
                                                  [key]: v,
                                                };
                                                let nextMp = {
                                                  ...adv.matchPlayerPermissions,
                                                };
                                                if (sync) {
                                                  nextMp = {
                                                    ...nextMp,
                                                    [key]: Object.fromEntries(
                                                      m.players.map((p) => [
                                                        String(p.playerId),
                                                        v,
                                                      ]),
                                                    ),
                                                  };
                                                }
                                                patch({
                                                  ...adv,
                                                  matchPermissions:
                                                    nextMatchPerms,
                                                  matchPlayerPermissions:
                                                    nextMp,
                                                });
                                              }}
                                            />
                                            <Collapsible className="mt-2 border-t border-border/50 pt-2">
                                              <CollapsibleTrigger
                                                type="button"
                                                className="group flex w-full items-center justify-between gap-2 rounded-md px-1 py-1.5 text-left text-xs font-medium hover:bg-muted/40"
                                              >
                                                <span className="flex min-w-0 flex-1 items-center gap-2">
                                                  <span>Player scores</span>
                                                  {matchHasPlayerMismatch ? (
                                                    <SharePlayerMismatchBadge />
                                                  ) : null}
                                                </span>
                                                <ChevronDown
                                                  className="text-muted-foreground size-4 shrink-0 transition-transform in-data-[state=open]:rotate-180"
                                                  aria-hidden
                                                />
                                              </CollapsibleTrigger>
                                              <CollapsibleContent>
                                                <div className="space-y-3 pt-1">
                                                  <PermissionViewEditHints
                                                    viewHint={
                                                      PERMISSION_SECTION_INTRO
                                                        .matchPlayers.view
                                                    }
                                                    editHint={
                                                      PERMISSION_SECTION_INTRO
                                                        .matchPlayers.edit
                                                    }
                                                  />
                                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <Label
                                                      htmlFor={`sync-mp-${rec.userId}-${key}`}
                                                      className="text-muted-foreground max-w-[min(100%,240px)] text-xs leading-snug"
                                                    >
                                                      Use session permission for
                                                      every player&apos;s score
                                                    </Label>
                                                    <Switch
                                                      id={`sync-mp-${rec.userId}-${key}`}
                                                      checked={sync}
                                                      onCheckedChange={(c) => {
                                                        const nextSync = {
                                                          ...adv.matchPlayerSyncWithMatch,
                                                          [key]: c,
                                                        };
                                                        let nextMp = {
                                                          ...adv.matchPlayerPermissions,
                                                        };
                                                        const mp =
                                                          adv.matchPermissions[
                                                            key
                                                          ] ?? "view";
                                                        if (c) {
                                                          nextMp = {
                                                            ...nextMp,
                                                            [key]:
                                                              Object.fromEntries(
                                                                m.players.map(
                                                                  (p) => [
                                                                    String(
                                                                      p.playerId,
                                                                    ),
                                                                    mp,
                                                                  ],
                                                                ),
                                                              ),
                                                          };
                                                        }
                                                        patch({
                                                          ...adv,
                                                          matchPlayerSyncWithMatch:
                                                            nextSync,
                                                          matchPlayerPermissions:
                                                            nextMp,
                                                        });
                                                      }}
                                                    />
                                                  </div>
                                                  {sync ? (
                                                    <p className="text-muted-foreground text-[11px] leading-snug">
                                                      All seats follow the View
                                                      or Edit level for this
                                                      session above.
                                                    </p>
                                                  ) : (
                                                    <ul className="space-y-1">
                                                      {m.players.map((p) => {
                                                        const seatMismatch =
                                                          playerMismatchSet?.has(
                                                            String(p.playerId),
                                                          ) ?? false;
                                                        return (
                                                          <li
                                                            key={p.playerId}
                                                            className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 py-1.5 last:border-0"
                                                          >
                                                            <span className="text-foreground flex min-w-0 flex-1 items-center gap-2 text-xs font-medium">
                                                              {p.name}
                                                              {seatMismatch ? (
                                                                <SharePlayerMismatchBadge />
                                                              ) : null}
                                                            </span>
                                                            <SharePermissionTierToggle
                                                              value={
                                                                adv
                                                                  .matchPlayerPermissions[
                                                                  key
                                                                ]?.[
                                                                  String(
                                                                    p.playerId,
                                                                  )
                                                                ] ?? "view"
                                                              }
                                                              onValueChange={(
                                                                perm,
                                                              ) => {
                                                                patch({
                                                                  ...adv,
                                                                  matchPlayerPermissions:
                                                                    {
                                                                      ...adv.matchPlayerPermissions,
                                                                      [key]: {
                                                                        ...adv
                                                                          .matchPlayerPermissions[
                                                                          key
                                                                        ],
                                                                        [String(
                                                                          p.playerId,
                                                                        )]:
                                                                          perm,
                                                                      },
                                                                    },
                                                                });
                                                              }}
                                                              aria-label={`${p.name} score permission for ${m.name}`}
                                                            />
                                                          </li>
                                                        );
                                                      })}
                                                    </ul>
                                                  )}
                                                </div>
                                              </CollapsibleContent>
                                            </Collapsible>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </section>

                                <section className="space-y-2">
                                  <p className="text-muted-foreground flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase">
                                    <MapPin className="size-3" aria-hidden />
                                    Locations (from matches)
                                  </p>
                                  <PermissionViewEditHints
                                    viewHint={
                                      PERMISSION_SECTION_INTRO.locations.view
                                    }
                                    editHint={
                                      PERMISSION_SECTION_INTRO.locations.edit
                                    }
                                  />
                                  <div className="rounded-lg border border-border/70 bg-background/50 p-2">
                                    {locEntries.length === 0 ? (
                                      <p className="text-muted-foreground px-1 py-2 text-xs">
                                        Include a match location to set
                                        per-location access.
                                      </p>
                                    ) : (
                                      locEntries.map(
                                        ({ key: locKey, label }) => (
                                          <PermLabeledRow
                                            key={locKey}
                                            label={label}
                                            id={`loc-${rec.userId}-${locKey}`}
                                            value={
                                              adv.locationPermissions[locKey] ??
                                              "view"
                                            }
                                            onChange={(v) =>
                                              patch({
                                                ...adv,
                                                locationPermissions: {
                                                  ...adv.locationPermissions,
                                                  [locKey]: v,
                                                },
                                              })
                                            }
                                          />
                                        ),
                                      )
                                    )}
                                  </div>
                                </section>
                              </>
                            ) : null}

                            {shareOptions.scoresheets ? (
                              <section className="space-y-2">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                                      Players (scoresheets)
                                    </p>
                                    {hasRecipientMismatch ? (
                                      <SharePlayerMismatchBadge />
                                    ) : null}
                                  </div>
                                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                    People who appear on your scoresheets (from
                                    match history). Use Not shared to exclude
                                    someone; View or Edit for each row below.
                                  </p>
                                  <PermissionViewEditHints
                                    viewHint={
                                      PERMISSION_SECTION_INTRO.scoresheetPlayers
                                        .view
                                    }
                                    editHint={
                                      PERMISSION_SECTION_INTRO.scoresheetPlayers
                                        .edit
                                    }
                                  />
                                </div>
                                <ul className="divide-y divide-border/60 rounded-lg border border-border/70 bg-background/50">
                                  {scoresheetPlayersFromPreview(gameData).map(
                                    (p) => (
                                      <li key={p.id} className="px-2 py-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <p className="text-foreground flex min-w-0 flex-1 items-center gap-2 text-xs font-medium">
                                            {p.name}
                                            {playerMismatchSet?.has(p.id) ? (
                                              <SharePlayerMismatchBadge />
                                            ) : null}
                                          </p>
                                          <PlayerSharePermissionSelect
                                            id={`ssp-${rec.userId}-${p.id}`}
                                            value={
                                              adv.scoresheetPlayerPermissions[
                                                p.id
                                              ] ?? "none"
                                            }
                                            onValueChange={(v) => {
                                              const nextPerms = {
                                                ...adv.scoresheetPlayerPermissions,
                                              };
                                              if (v === "none") {
                                                delete nextPerms[p.id];
                                              } else {
                                                nextPerms[p.id] = v;
                                              }
                                              patch({
                                                ...adv,
                                                scoresheetPlayerPermissions:
                                                  nextPerms,
                                              });
                                            }}
                                            aria-label={`${p.name} scoresheet permission`}
                                          />
                                        </div>
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </section>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  }}
                </form.Subscribe>
              );
            })}
          </div>
        );
      }}
    </form.Subscribe>
  );
};
