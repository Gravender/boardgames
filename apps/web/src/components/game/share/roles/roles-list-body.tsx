"use client";

import { Checkbox } from "@board-games/ui/checkbox";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@board-games/ui/item";
import { Label } from "@board-games/ui/label";

import { ShareInfoPopoverButton } from "../share-info-popover-button";
import { getRoleScoresheetHint } from "../share-role-scoresheet-hint";
import type { GameToShare } from "../types";
import type { ShareGameForm } from "../use-share-game-form";

type RolesListBodyProps = {
  form: ShareGameForm;
  rows: GameToShare["gameRoles"];
};

export const RolesListBody = ({ form, rows }: RolesListBodyProps) => {
  return (
    <div className="h-[min(220px,40vh)] overflow-hidden rounded-lg border border-border">
      <div className="max-h-[min(220px,40vh)] overflow-y-auto p-2">
        <ItemGroup className="gap-2" role="list">
          {rows.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">
              No roles match your filters.
            </p>
          ) : (
            rows.map((role) => (
              <Item
                key={role.id}
                variant="outline"
                size="sm"
                role="listitem"
                className="items-center"
              >
                <ItemMedia variant="icon" className="shrink-0 self-center">
                  <form.Field name={`roleInclusion.${role.id}`}>
                    {(field) => (
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={field.state.value}
                        onCheckedChange={(c) => field.handleChange(c === true)}
                      />
                    )}
                  </form.Field>
                </ItemMedia>
                <ItemContent>
                  <div className="flex min-w-0 flex-wrap items-center gap-1">
                    <ItemTitle className="min-w-0">
                      <Label
                        htmlFor={`role-${role.id}`}
                        className="cursor-pointer"
                      >
                        {role.name}
                      </Label>
                    </ItemTitle>
                    <ItemActions>
                      <ShareInfoPopoverButton
                        label={role.name}
                        title={role.name}
                      >
                        <p className="text-muted-foreground leading-relaxed">
                          {role.description ?? "No description."}
                        </p>
                      </ShareInfoPopoverButton>
                    </ItemActions>
                  </div>
                  <ItemDescription>
                    {getRoleScoresheetHint(role.id)}
                  </ItemDescription>
                </ItemContent>
              </Item>
            ))
          )}
        </ItemGroup>
      </div>
    </div>
  );
};
