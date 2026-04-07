"use client";

import { X } from "lucide-react";

import { Button } from "@board-games/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@board-games/ui/combobox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@board-games/ui/item";
import { Label } from "@board-games/ui/label";

import { PlayerImage } from "~/components/player-image";
import { useFormContext } from "~/hooks/form";

import { useShareGameData } from "./share-game-data-context";
import {
  ShareInlineValidationAlert,
  shareSectionErrorRingClass,
} from "./share-inline-validation";
import { PERMISSION_SECTION_INTRO } from "./share-permission-copy";
import { SharePermissionTierToggle } from "./share-permission-tier-toggle";
import { PermissionViewEditHints } from "./share-permission-view-edit-hints";
import type { FriendRow, ShareGameFormValues } from "./types";
import {
  addRecipient,
  removeRecipient,
  type ShareGameForm,
} from "./use-share-game-form";

const ShareBasicPermissionExplainer = ({
  shareOptions,
}: {
  shareOptions: ShareGameFormValues["shareOptions"];
}) => (
  <div
    className="border-border/60 bg-muted/20 rounded-lg border p-3 text-xs"
    role="region"
    aria-label="What View and Edit mean in basic mode"
  >
    <p className="text-foreground font-medium">
      View vs Edit (applies to each person)
    </p>
    <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
      One choice covers everything you include in this share (game plus the
      sections you turn on below).
    </p>
    <ul className="mt-3 space-y-3">
      <li>
        <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
          Game
        </p>
        <PermissionViewEditHints
          viewHint={PERMISSION_SECTION_INTRO.game.view}
          editHint={PERMISSION_SECTION_INTRO.game.edit}
          className="border-border/50 bg-muted/30 mt-1 rounded-md border px-2 py-1.5"
        />
      </li>
      {shareOptions.roles ? (
        <li>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Roles
          </p>
          <PermissionViewEditHints
            viewHint={PERMISSION_SECTION_INTRO.roles.view}
            editHint={PERMISSION_SECTION_INTRO.roles.edit}
            className="border-border/50 bg-muted/30 mt-1 rounded-md border px-2 py-1.5"
          />
        </li>
      ) : null}
      {shareOptions.scoresheets ? (
        <li>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Scoresheets
          </p>
          <PermissionViewEditHints
            viewHint={PERMISSION_SECTION_INTRO.scoresheets.view}
            editHint={PERMISSION_SECTION_INTRO.scoresheets.edit}
            className="border-border/50 bg-muted/30 mt-1 rounded-md border px-2 py-1.5"
          />
        </li>
      ) : null}
      {shareOptions.matches ? (
        <li>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Matches
          </p>
          <PermissionViewEditHints
            viewHint={PERMISSION_SECTION_INTRO.matches.view}
            editHint={PERMISSION_SECTION_INTRO.matches.edit}
            className="border-border/50 bg-muted/30 mt-1 rounded-md border px-2 py-1.5"
          />
        </li>
      ) : null}
    </ul>
  </div>
);

type RecipientsSectionProps = {
  sharingMode: "basic" | "advanced";
  friends: FriendRow[];
  validationMessages?: string[];
};

export const RecipientsSection = ({
  sharingMode,
  validationMessages,
  friends,
}: RecipientsSectionProps) => {
  const form = useFormContext() as unknown as ShareGameForm;
  const gameData = useShareGameData();

  return (
    <form.Subscribe selector={(s) => ({ shareOptions: s.values.shareOptions })}>
      {({ shareOptions }) => (
        <form.Field name="recipients">
          {(field) => {
            const selected = field.state.value;
            const available = friends.filter(
              (u) => !selected.some((s) => s.userId === u.id),
            );

            const handlePick = (user: FriendRow) => {
              addRecipient(form, gameData, user);
            };

            const handleRemove = (userId: string) => {
              removeRecipient(form, userId);
            };

            const handlePermissionChange = (
              userId: string,
              permission: "view" | "edit",
            ) => {
              field.handleChange(
                selected.map((entry) =>
                  entry.userId === userId ? { ...entry, permission } : entry,
                ),
              );
            };

            return (
              <Card
                id="share-section-recipients"
                className={shareSectionErrorRingClass(
                  (validationMessages?.length ?? 0) > 0,
                )}
              >
                <CardHeader>
                  <ShareInlineValidationAlert messages={validationMessages} />
                  <CardTitle className="text-base">
                    Who are you sharing with?
                  </CardTitle>
                  <CardDescription>
                    Search and add people. Set View or Edit for each recipient.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sharingMode === "basic" && selected.length > 0 ? (
                    <ShareBasicPermissionExplainer
                      shareOptions={shareOptions}
                    />
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="share-user-search">User search</Label>
                    <Combobox
                      key={selected.map((r) => r.userId).join("|")}
                      items={available}
                      itemToStringLabel={(u: FriendRow) => u.name}
                      itemToStringValue={(u: FriendRow) => u.id}
                      disabled={available.length === 0}
                      onValueChange={(v) => {
                        if (v) handlePick(v as FriendRow);
                      }}
                    >
                      <ComboboxInput
                        id="share-user-search"
                        placeholder={
                          available.length === 0
                            ? "Everyone is already added"
                            : "Search users to add…"
                        }
                        className="w-full"
                      />
                      <ComboboxContent align="start" side="bottom">
                        <ComboboxEmpty>No users found.</ComboboxEmpty>
                        <ComboboxList>
                          {(user: FriendRow) => (
                            <ComboboxItem key={user.id} value={user}>
                              <PlayerImage
                                image={user.image}
                                alt=""
                                className="size-6 shrink-0"
                              />
                              <span className="truncate">{user.name}</span>
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </div>

                  {selected.length > 0 ? (
                    <ItemGroup className="gap-3">
                      {selected.map((r) => {
                        const user = friends.find((u) => u.id === r.userId);
                        if (!user) return null;
                        return (
                          <Item
                            key={r.userId}
                            variant="outline"
                            size="sm"
                            role="listitem"
                            className="bg-muted/30 items-center"
                          >
                            <ItemMedia variant="image">
                              <PlayerImage
                                image={user.image}
                                alt=""
                                className="size-8"
                              />
                            </ItemMedia>
                            <ItemContent className="min-w-0">
                              <ItemTitle title={user.name}>
                                {user.name}
                              </ItemTitle>
                            </ItemContent>
                            <ItemActions className="shrink-0">
                              {sharingMode === "basic" ? (
                                <SharePermissionTierToggle
                                  value={r.permission}
                                  onValueChange={(v) =>
                                    handlePermissionChange(r.userId, v)
                                  }
                                  id={`perm-${r.userId}`}
                                  aria-label={`Permission for ${user.name}`}
                                />
                              ) : (
                                <span className="text-muted-foreground text-xs whitespace-nowrap">
                                  See advanced permissions
                                </span>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Remove ${user.name}`}
                                onClick={() => handleRemove(r.userId)}
                              >
                                <X className="size-4" />
                              </Button>
                            </ItemActions>
                          </Item>
                        );
                      })}
                    </ItemGroup>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No recipients yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          }}
        </form.Field>
      )}
    </form.Subscribe>
  );
};
