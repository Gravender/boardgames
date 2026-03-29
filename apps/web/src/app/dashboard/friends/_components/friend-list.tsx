"use client";

import { useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

import { Badge } from "@board-games/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Input } from "@board-games/ui/input";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { useTRPC } from "~/trpc/react";
import { FriendCard } from "./friend-card";

export function FriendsList() {
  const trpc = useTRPC();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: friends } = useSuspenseQuery(
    trpc.friend.getFriends.queryOptions(),
  );

  const filteredFriends = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return friends.filter((friend) => {
      const name = friend.name;
      const email = friend.email ?? "";
      return (
        name.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query)
      );
    });
  }, [friends, searchQuery]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Your Friends</CardTitle>
          <Badge variant="outline">{friends.length}</Badge>
        </div>
        <CardDescription>People you've connected with</CardDescription>
        <div className="relative mt-2">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder="Search friends..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredFriends.length > 0 ? (
          <ScrollArea>
            <div className="grid max-h-[600px] gap-2">
              {filteredFriends.map((friend) => (
                <FriendCard key={friend.id} friend={friend} />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              {searchQuery
                ? "No friends match your search"
                : "You don't have any friends yet"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
