"use client";

import { useSelectedLayoutSegments } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
} from "./ui/breadcrumb";
import { CapatilizeFirstLetterOfEachWord } from "~/lib/utils";

export function BreadCrumbs() {
  const segments = useSelectedLayoutSegments();
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink
            href={
              segments.length > 0 ? `/dashboard/${segments[0]}` : "/dashboard"
            }
          >
            {segments[0]
              ? CapatilizeFirstLetterOfEachWord(segments[0])
              : "DashBoard"}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments[0] !== undefined && segments[1] !== undefined && (
          <BreadcrumbItem>
            <BreadcrumbLink href={`/dashboard/${segments[0]}/${segments[1]}`}>
              {CapatilizeFirstLetterOfEachWord(segments[1])}
            </BreadcrumbLink>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}