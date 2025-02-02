"use client";

import React, { forwardRef, useRef } from "react";

import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/animated-beam";
import { LucideServer, LucideUser } from "lucide-react";

const Circle = forwardRef<HTMLDivElement, { className?: string; children?: React.ReactNode }>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex size-12 items-center justify-center rounded-full border-2 bg-secondary-foreground p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
        className
      )}>
      {children}
    </div>
  );
});

export function AnimatedBeamConnection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const div1Ref = useRef<HTMLDivElement>(null);
  const div2Ref = useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative flex w-full max-w-[340px] items-center justify-center overflow-hidden rounded-lg  bg-background p-4"
      ref={containerRef}>
      <div className="flex size-full flex-col items-stretch justify-between gap-10">
        <div className="flex flex-row justify-between">
          <Circle ref={div1Ref}>
            <LucideUser className="text-secondary" />
          </Circle>

          <Circle ref={div2Ref}>
            <LucideServer className="text-secondary" />
          </Circle>
        </div>
      </div>

      <AnimatedBeam duration={2} containerRef={containerRef} fromRef={div1Ref} toRef={div2Ref} />
    </div>
  );
}
