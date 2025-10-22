import { UserRoundIcon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Skeleton } from "@board-games/ui/skeleton";
import { cn } from "@board-games/ui/utils";

export interface UserViewClassNames {
  base?: string;
  avatar?: string;
  content?: string;
  title?: string;
  subtitle?: string;
  skeleton?: string;
}
export interface Profile {
  id?: string | number;
  email?: string | null;
  name?: string | null;
  displayUsername?: string | null;
  username?: string | null;
  displayName?: string | null;
  fullName?: string | null;
  isAnonymous?: boolean | null;
  emailVerified?: boolean | null;
  image?: string | null;
  avatar?: string | null;
  avatarUrl?: string | null;
}
export interface UserViewProps {
  className?: string;
  classNames?: UserViewClassNames;
  isPending?: boolean;
  size?: "sm" | "default" | "lg" | null;
  user?: Profile | null;
}
export function UserView({
  className,
  classNames,
  isPending,
  size,
  user,
}: UserViewProps) {
  return (
    <div className={cn("flex items-center gap-2", className, classNames?.base)}>
      {isPending ? (
        <Skeleton
          className={cn(
            "shrink-0 rounded-full",
            size === "sm" ? "size-6" : size === "lg" ? "size-10" : "size-8",
            classNames?.avatar,
          )}
        />
      ) : (
        <Avatar
          className={cn(
            "bg-muted",
            size === "sm" ? "size-6" : size === "lg" ? "size-10" : "size-8",
            classNames?.avatar,
          )}
        >
          <AvatarImage
            alt={
              user?.displayUsername ??
              user?.username ??
              user?.displayName ??
              user?.name ??
              user?.fullName ??
              user?.email ??
              "Anonymous User"
            }
            src={user?.image ?? user?.avatar ?? user?.avatarUrl ?? ""}
          />

          <AvatarFallback className={"text-foreground uppercase"}>
            <UserRoundIcon className="size-[50%]" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "grid flex-1 text-left leading-tight",
          classNames?.content,
        )}
      >
        {isPending ? (
          <>
            <Skeleton
              className={cn(
                "max-w-full",
                size === "lg" ? "h-4.5 w-32" : "h-3.5 w-24",
                classNames?.title,
                classNames?.skeleton,
              )}
            />
            {size !== "sm" && (
              <Skeleton
                className={cn(
                  "mt-1.5 max-w-full",
                  size === "lg" ? "h-3.5 w-40" : "h-3 w-32",
                  classNames?.subtitle,
                  classNames?.skeleton,
                )}
              />
            )}
          </>
        ) : (
          <>
            <span
              className={cn(
                "truncate font-semibold",
                size === "lg" ? "text-base" : "text-sm",
                classNames?.title,
              )}
            >
              {user?.displayUsername ??
                user?.username ??
                user?.displayName ??
                user?.name ??
                user?.fullName ??
                user?.email ??
                "Anonymous User"}
            </span>

            {!user?.isAnonymous &&
              size !== "sm" &&
              (user?.name ?? user?.username) && (
                <span
                  className={cn(
                    "truncate opacity-70",
                    size === "lg" ? "text-sm" : "text-xs",
                    classNames?.subtitle,
                  )}
                >
                  {user.email}
                </span>
              )}
          </>
        )}
      </div>
    </div>
  );
}
