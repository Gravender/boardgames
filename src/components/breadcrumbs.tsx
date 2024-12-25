"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { z } from "zod";

import { CapitalizeFirstLetterOfEachWord } from "~/lib/utils";
import { api } from "~/trpc/react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";

export function BreadCrumbs() {
  const { userId } = useAuth();
  const paths = usePathname();

  const pathNames = paths.split("/").filter((path) => path);
  const pathItems = pathNames.slice(0, 2).map((path, i) => {
    return {
      name: path,
      path: pathNames.slice(0, i + 1).join("/"),
    };
  });
  const pathsSchema = z.enum(["games", "players"]);
  const pathType = pathsSchema.safeParse(pathNames[1]);
  const id =
    pathNames.length > 3 && pathType.data === "games"
      ? Number(pathNames[3])
      : Number(pathNames[2]);
  const enabled =
    pathNames.length > 2 && pathType.success && !isNaN(id) && !!userId;
  const { data } = api.dashboard.getBreadCrumbs.useQuery(
    {
      type:
        pathNames.length > 3 && pathType.data === "games"
          ? "match"
          : (pathType.data ?? "games"),
      path: id,
    },
    {
      enabled: enabled,
    },
  );

  if (pathNames.length > 2 && pathType.success && !isNaN(id) && userId) {
    if (pathType.data === "games" && data) {
      if (pathNames.length > 3 && data.game) {
        return (
          <RenderBreadCrumbs
            pathItems={[
              ...pathItems,
              {
                name: data.game.name,
                path: pathNames.slice(0, 3).join("/"),
              },
              {
                name: data.name,
                path: pathNames.slice(0, 2).join("/"),
              },
            ]}
          />
        );
      }
      return (
        <RenderBreadCrumbs
          pathItems={[
            ...pathItems,
            {
              name: data.name,
              path: pathNames.slice(0, 3).join("/"),
            },
          ]}
        />
      );
    }
    if (pathType.data === "players" && data) {
      return (
        <RenderBreadCrumbs
          pathItems={[
            ...pathItems,
            {
              name: data.name,
              path: pathNames.slice(0, 3).join("/"),
            },
          ]}
        />
      );
    }

    return <RenderBreadCrumbs pathItems={pathItems} />;
  }

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
                    <Link href={`/${item.path}`}>{item.name}</Link>
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
