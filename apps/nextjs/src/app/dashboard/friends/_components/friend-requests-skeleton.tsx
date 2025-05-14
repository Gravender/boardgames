import { UserCheck, ClockIcon as UserClock } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Skeleton } from "@board-games/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

export function FriendRequestsSkeleton() {
  return (
    <Tabs defaultValue="received">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="received" className="flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          <span>Received</span>
        </TabsTrigger>
        <TabsTrigger value="sent" className="flex items-center gap-2">
          <UserClock className="h-4 w-4" />
          <span>Sent</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="received">
        <Card>
          <CardHeader>
            <CardTitle>Friend Requests</CardTitle>
            <CardDescription>
              People who want to connect with you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array(2)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-grow space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
