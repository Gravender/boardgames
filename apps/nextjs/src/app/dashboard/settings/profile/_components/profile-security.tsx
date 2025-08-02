"use server";

import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Clock,
  Globe,
  Laptop,
  MapPin,
  Monitor,
  SmartphoneIcon,
  Tablet,
} from "lucide-react";

import { Badge } from "@board-games/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@board-games/ui/tooltip";

import { authClient } from "~/auth/client";

export async function ProfileSecurity() {
  const sessions = await authClient.listSessions();
  const currentSession = authClient.useSession();

  const getDeviceIcon = (userAgent?: string) => {
    const userAgentLower = userAgent?.toLowerCase() ?? "";

    if (
      userAgentLower.includes("iphone") ||
      userAgentLower.includes("android")
    ) {
      return <SmartphoneIcon className="h-5 w-5" />;
    } else if (userAgentLower.includes("ipad")) {
      return <Tablet className="h-5 w-5" />;
    } else if (
      userAgentLower.includes("macbook") ||
      userAgentLower.includes("laptop")
    ) {
      return <Laptop className="h-5 w-5" />;
    } else if (userAgentLower.includes("mobile")) {
      return <SmartphoneIcon className="h-5 w-5" />;
    }

    return <Monitor className="h-5 w-5" />;
  };

  if (sessions.error) {
    return redirect("/login");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Security Log</CardTitle>
          <CardDescription>
            Review recent security activity on your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.data.length > 0 ? (
            sessions.data.map((session) => {
              const isCurrent = currentSession.data?.session.id === session.id;
              const userAgent = session.userAgent ?? "";
              const ipAddress = session.ipAddress ?? "Unknown IP";

              const title = userAgent.includes("Mobile")
                ? "Mobile device"
                : "Desktop device";

              const browser = userAgent || "Web browser";

              const location = "Unknown location"; // Better Auth doesn't provide location by default

              const lastActive = formatDistanceToNow(session.updatedAt, {
                addSuffix: true,
              });
              const isActive = session.expiresAt > new Date();

              return (
                <div
                  key={session.id}
                  className={`rounded-lg border p-4 ${isCurrent ? "border-primary/20 bg-primary/5" : ""} ${!isActive ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`rounded-full p-2 ${isCurrent ? "bg-primary/10" : "bg-muted"}`}
                      >
                        {getDeviceIcon(userAgent)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{title}</p>
                          {isCurrent && (
                            <Badge
                              variant="outline"
                              className="border-primary/20 bg-primary/10 text-xs text-primary"
                            >
                              Current
                            </Badge>
                          )}
                          {!isActive && (
                            <Badge
                              variant="outline"
                              className="border-destructive/20 bg-destructive/10 text-xs text-destructive"
                            >
                              Expired
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {browser}
                        </p>
                        <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-3">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {isCurrent
                                ? "Active now"
                                : `Last active ${lastActive}`}
                            </span>
                          </div>
                          <div className="hidden sm:block">•</div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{location}</span>
                          </div>
                          <div className="hidden sm:block">•</div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex cursor-help items-center gap-1">
                                <Globe className="h-3 w-3" />
                                <span>{ipAddress}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>IP Address</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-muted-foreground">
              No session information available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
