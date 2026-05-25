import { Link } from "~/components/link";

export const invalidTypedRoute = (
  // @ts-expect-error invalid typed route for compile-time enforcement
  <Link href="/this-route-does-not-exist">Broken Link</Link>
);
