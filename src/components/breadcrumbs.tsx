"use client";

import { Fragment, use, useEffect, useState } from "react";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { set } from "date-fns";

import { CapitalizeFirstLetterOfEachWord } from "~/lib/utils";
import { api } from "~/trpc/react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";

export function BreadCrumbs() {
  const paths = usePathname();
  const [id, setId] = useState<number | null>(null);

  const pathNames = paths.split("/").filter((path) => path);
  useEffect(() => {
    pathNames.forEach((path, i) => {
      if (!isNaN(Number(path)) && pathNames[i - 1] === "games") {
        setId(Number(path));
      }
    });
  }, [pathNames]);
  const { data: gameName } = api.game.getGameName.useQuery(
    { id: id ?? 0 },
    { enabled: id !== null },
  );
  const pathItems = pathNames.map((path, i) => {
    return {
      name: path,
      path: pathNames.slice(0, i + 1).join("/"),
    };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {pathItems.map((item, index) =>
          gameName || isNaN(Number(item.name)) ? (
            <Fragment key={item.path}>
              {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/${item.path}`}>
                    {CapitalizeFirstLetterOfEachWord(
                      id && item.name === String(id)
                        ? (gameName ?? item.name)
                        : item.name,
                    )}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </Fragment>
          ) : null,
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
