"use client";

import type React from "react";
import Image from "next/image";
import { Clock, Dices, Plus } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@board-games/ui/carousel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@board-games/ui/tooltip";

export function MatchImages() {
  const images: {
    id: string;
    url: string;
    caption: string;
    timestamp?: string;
  }[] = [
    {
      id: "1",
      url: "https://picsum.photos/seed/mf6JIDOr7k/54/898?grayscale&blur=7",
      caption: "Game Setup",
      timestamp: "19:45:12",
    },
    {
      id: "2",
      url: "https://picsum.photos/seed/HnzMflyfs/2495/2610?blur=8",
      caption: "Intense Moment",
      timestamp: "19:52:33",
    },
    {
      id: "3",
      url: "",
      caption: "Victory Dance",
      timestamp: "20:01:45",
    },
    {
      id: "4",
      url: "",
      caption: "Card Spread",
      timestamp: "20:08:21",
    },
    {
      id: "5",
      url: "",
      caption: "The chaos after round 3!",
      timestamp: "20:08:21",
    },
    {
      id: "6",
      url: "",
      caption: "The chaos after round 3!",
      timestamp: "20:08:21",
    },
    {
      id: "7",
      url: "",
      caption: "The chaos after round 3!",
      timestamp: "20:08:21",
    },
    {
      id: "8",
      url: "",
      caption: "The chaos after round 3!",
      timestamp: "20:08:21",
    },
    {
      id: "9",
      url: "",
      caption: "The chaos after round 3!",
      timestamp: "20:08:21",
    },
    {
      id: "10",
      url: "",
      caption: "The chaos after round 3!",
      timestamp: "20:08:21",
    },
    {
      id: "11",
      url: "",
      caption: "The chaos after round 3!",
      timestamp: "20:08:21",
    },
    {
      id: "12",
      url: "",
      caption: "The chaos after round 3!",
      timestamp: "20:08:21",
    },
  ];

  return (
    <Card className="border-none">
      <CardHeader className="pb-2 pt-2">
        <CardTitle className="text-lg">Match Images</CardTitle>
      </CardHeader>

      <CardContent className="px-8 sm:px-14">
        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="ml-0">
            {images.map((image) => (
              <Tooltip key={image.id}>
                <TooltipTrigger asChild>
                  <button
                    className="flex basis-1/6 pl-2 first:pl-0"
                    onClick={() => console.log(image.caption)}
                  >
                    <CarouselItem className="relative flex aspect-square size-full shrink-0 overflow-hidden rounded-md border p-0">
                      {image.url ? (
                        <Image
                          src={image.url}
                          alt={image.caption}
                          fill
                          className="aspect-square size-full rounded-md object-cover"
                        />
                      ) : (
                        <Dices className="size-full items-center justify-center rounded-md bg-muted p-2" />
                      )}
                    </CarouselItem>
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{image.caption}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{image.timestamp}</span>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </CardContent>
    </Card>
  );
}
