"use client";

import type { ComponentPropsWithoutRef, MouseEvent } from "react";
import { trackEvent, type TrackingEvent } from "@/lib/analytics";

type Props = ComponentPropsWithoutRef<"a"> & {
  tracking: TrackingEvent;
};

export default function TrackedLink({ tracking, onClick, ...props }: Props) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (!event.defaultPrevented) trackEvent(tracking);
  }

  return <a {...props} onClick={handleClick} />;
}
