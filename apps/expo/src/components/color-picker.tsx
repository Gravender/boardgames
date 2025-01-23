import type { returnedResults } from "reanimated-color-picker";
import React, { Fragment, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FullWindowOverlay } from "react-native-screens";
import { PortalHost } from "@rn-primitives/portal";
import ColorPicker, {
  colorKit,
  HueSlider,
  OpacitySlider,
  Panel1,
  PreviewText,
  Swatches,
} from "reanimated-color-picker";

import { Paintbrush } from "~/lib/icons/Paintbrush";
import { cn } from "~/lib/utils";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

const WindowOverlay =
  Platform.OS === "ios" ? FullWindowOverlay : React.Fragment;

export function GradientPicker({
  color,
  setColor: setColor,
  className,
  portalHost,
}: {
  color: string | undefined;
  setColor: (color: string) => void;
  className?: string;
  portalHost?: string;
}) {
  const insets = useSafeAreaInsets();
  const contentInsets = {
    top: insets.top,
    bottom: insets.bottom,
    left: 16,
    right: 16,
  };
  const customSwatches = [
    "#64748b",
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#10b981",
    "#14b8a6",
    "#06b6d4",
    "#0ea5e9",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
  ];

  const onColorSelect = (color: returnedResults) => {
    "worklet";
    setColor(color.hex);
  };

  return (
    <Fragment>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "justify-start p-0 text-left font-normal",
              !color && "text-muted-foreground",
              className,
            )}
            size={"icon"}
          >
            <View
              className="flex h-10 w-10 items-center justify-center rounded"
              style={{ backgroundColor: color ?? "none" }}
            >
              {!color && (
                <Paintbrush
                  className="h-8 w-8 text-primary"
                  size={20}
                  strokeWidth={1.5}
                />
              )}
            </View>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side={Platform.OS === "web" ? "bottom" : "top"}
          insets={contentInsets}
          portalHost={portalHost}
        >
          <Animated.View className="flex-1 content-center justify-center">
            <View className="self-center">
              <ColorPicker
                value={color}
                sliderThickness={25}
                thumbSize={24}
                thumbShape="circle"
                onChange={onColorSelect}
                boundedThumb
              >
                <Swatches
                  style={styles.swatchesContainer}
                  swatchStyle={styles.swatchStyle}
                  colors={customSwatches}
                />
              </ColorPicker>
            </View>
          </Animated.View>
        </PopoverContent>
      </Popover>
    </Fragment>
  );
}
const styles = StyleSheet.create({
  swatchesContainer: {
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  swatchStyle: {
    borderRadius: 20,
    height: 30,
    width: 30,
    margin: 0,
    marginBottom: 0,
    marginHorizontal: 0,
    marginVertical: 0,
  },
});
