// design-sync shim: next/link renders a plain anchor outside a Next app.
import type { ComponentPropsWithoutRef } from "react";

type Props = ComponentPropsWithoutRef<"a"> & { href: string; prefetch?: boolean; replace?: boolean; scroll?: boolean };

export default function Link({ prefetch, replace, scroll, ...rest }: Props) {
  return <a {...rest} />;
}
