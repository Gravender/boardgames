"use client";

import type { SessionWithActivitiesResource } from "@clerk/types";
import { useEffect, useState } from "react";
import { compareDesc, formatDistanceToNow } from "date-fns";
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

export function ProfileSecurity() {
  const { user } = useUser();
  const { session: currentSession } = useSession();
  const [sessionList, setSessionList] = useState<
    SessionWithActivitiesResource[]
  >([]);

  useEffect(() => {
    async function getData() {
      if (!user) return;
      try {
        const res = await user.getSessions();
        setSessionList(res);
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      }
    }
    void getData();
  }, [user]);

  const getDeviceIcon = (session: SessionWithActivitiesResource) => {
    const { deviceType, isMobile } = session.latestActivity;

    const deviceTypeLower = deviceType?.toLowerCase() ?? "";

    if (
      deviceTypeLower.includes("iphone") ||
      deviceTypeLower.includes("android")
    ) {
      return <SmartphoneIcon className="h-5 w-5" />;
    } else if (deviceTypeLower.includes("ipad")) {
      return <Tablet className="h-5 w-5" />;
    } else if (
      deviceTypeLower.includes("macbook") ||
      deviceTypeLower.includes("laptop")
    ) {
      return <Laptop className="h-5 w-5" />;
    } else if (isMobile) {
      return <SmartphoneIcon className="h-5 w-5" />;
    }

    return <Monitor className="h-5 w-5" />;
  };

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
          {sessionList
            .toSorted((a, b) => compareDesc(a.lastActiveAt, b.lastActiveAt))
            .map((session) => {
              const isCurrent = currentSession?.id === session.id;
              const {
                city,
                country,
                browserName,
                browserVersion,
                deviceType,
                ipAddress,
                isMobile,
              } = session.latestActivity;

              const title =
                (deviceType ?? isMobile) ? "Mobile device" : "Desktop device";

              const browser =
                `${browserName ?? ""} ${browserVersion ?? ""}`.trim() ||
                "Web browser";

              const location =
                [city ?? "", country ?? ""].filter(Boolean).join(", ").trim() ||
                "Unknown location";

              const lastActive = formatDistanceToNow(session.lastActiveAt, {
                addSuffix: true,
              });
              const isActive = session.status === "active";

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
                        {getDeviceIcon(session)}
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
                              Terminated
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
                                <span>{ipAddress ?? "Unknown IP"}</span>
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
            })}
        </CardContent>
      </Card>
    </div>
  );
}
