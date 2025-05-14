"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

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
  const paths = usePathname();

  const segments = paths.split("/").slice(2);

  const { data } = useQuery(
    trpc.dashboard.getBreadCrumbs.queryOptions({
      rootHref: paths
        .split("/")
        .filter((path) => path)
        .slice(0, 1)
        .join("/"),
      segments: segments,
    }),
  );

  return (
    <RenderBreadCrumbs
      pathItems={
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        data ??
        paths
          .split("/")
          .filter((path) => path)
          .slice(1)
          .map((path, i) => {
            if (Number(path)) return null;
            return {
              name: path
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase()),
              path: paths
                .split("/")
                .filter((path) => path)
                .slice(0, i + 1)
                .join("/"),
            };
          })
          .filter((pathItem) => pathItem !== null)
      }
    />
  );
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
