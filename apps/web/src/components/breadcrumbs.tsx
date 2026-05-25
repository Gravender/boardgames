"use client";

import { Fragment } from "react";
import { Link } from "~/components/link";
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

  const parts = paths.split("/").filter(Boolean);

  const { data } = useQuery(
    trpc.dashboard.getBreadCrumbs.queryOptions({
      segments: parts,
    }),
  );

  return (
    <RenderBreadCrumbs
      pathItems={
        data ??
        parts
          .map((segment, i) => {
            if (Number(segment)) return null;
            return {
              name: segment
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase()),
              path: parts.slice(0, i + 1).join("/"),
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
            <Fragment key={item.path}>
              {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
              <BreadcrumbItem>
                {index + 1 === pathItems.length ? (
                  <BreadcrumbPage>{item.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    render={
                      <Link href={`/${item.path}`}>
                        {item.name}
                      </Link>
                    }
                  />
                )}
              </BreadcrumbItem>
            </Fragment>
          ) : null,
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
