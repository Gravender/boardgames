"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import type { RouterInputs, RouterOutputs } from "@board-games/api";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@board-games/ui/breadcrumb";

import { useTRPC } from "~/trpc/react";

export function BreadCrumbs() {
  const trpc = useTRPC();
  const { userId } = useAuth();
  const paths = usePathname();

  const [type, setType] = useState<
    RouterInputs["dashboard"]["getBreadCrumbs"]["type"] | "other"
  >("other");
  const [path, setPath] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [pathItems, setPathItems] = useState<{ name: string; path: string }[]>(
    paths
      .split("/")
      .filter((path) => path)
      .slice(0, 2)
      .map((path, i) => {
        return {
          name: path,
          path: paths
            .split("/")
            .filter((path) => path)
            .slice(0, i + 1)
            .join("/"),
        };
      }),
  );

  useEffect(() => {
    const tempPathNames = paths.split("/").filter((path) => path);
    const tempPathItems = tempPathNames.slice(0, 2).map((path, i) => {
      return {
        name: path,
        path: tempPathNames.slice(0, i + 1).join("/"),
      };
    });
    const pathsSchema = z.enum(["games", "players", "groups"]);
    const pathType = pathsSchema.safeParse(tempPathNames[1]);
    const parsedId =
      tempPathNames.length > 3 && pathType.data === "games"
        ? Number(tempPathNames[3])
        : Number(tempPathNames[2]);
    const id = isNaN(parsedId) ? 0 : parsedId;
    setPath(id);
    setEnabled(
      tempPathNames.length > 2 &&
        pathType.success &&
        !isNaN(parsedId) &&
        !!userId,
    );
    setType(
      tempPathNames.length > 3 && pathType.data === "games"
        ? "match"
        : (pathType.data ?? "other"),
    );
    setPathItems(tempPathItems);
  }, [paths, userId]);
  const BreadCrumbsQuery = useQuery(
    trpc.dashboard.getBreadCrumbs.queryOptions(
      {
        type: type === "other" ? "games" : type,
        path: path,
      },
      { enabled: enabled },
    ),
  );
  const data = BreadCrumbsQuery.data as
    | RouterOutputs["dashboard"]["getBreadCrumbs"]
    | undefined;
  useEffect(() => {
    const tempPathNames = paths.split("/").filter((path) => path);
    const tempPathItems = tempPathNames.slice(0, 2).map((path, i) => {
      return {
        name: path,
        path: tempPathNames.slice(0, i + 1).join("/"),
      };
    });
    if ((type == "games" || type == "match") && data) {
      if (tempPathNames.length > 3 && data.game !== undefined) {
        setPathItems(() => [
          ...tempPathItems,
          {
            name: data.game.name,
            path: tempPathNames.slice(0, 3).join("/"),
          },
          {
            name: data.name,
            path: tempPathNames.slice(0, 2).join("/"),
          },
        ]);
      } else {
        setPathItems(() => [
          ...tempPathItems,
          {
            name: data.name,
            path: tempPathNames.slice(0, 3).join("/"),
          },
        ]);
      }
    }
    if (type === "players" && data) {
      setPathItems(() => [
        ...tempPathItems,
        {
          name: data.name,
          path: tempPathNames.slice(0, 3).join("/"),
        },
      ]);
    }
    if (type === "groups" && data) {
      setPathItems(() => [
        ...tempPathItems,
        {
          name: data.name,
          path: tempPathNames.slice(0, 3).join("/"),
        },
      ]);
    }
  }, [data, type, paths]);

  return <RenderBreadCrumbs pathItems={pathItems} />;
}

const RenderBreadCrumbs = ({
  pathItems,
}: {
  pathItems: { name: string; path: string }[];
}) => {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {pathItems.map((item, index) =>
          isNaN(Number(item.name)) ? (
            <Fragment key={item.path + index}>
              {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
              <BreadcrumbItem>
                {index + 1 === pathItems.length ? (
                  <BreadcrumbPage>{item.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link prefetch={true} href={`/${item.path}`}>
                      {item.name}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          ) : null,
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
