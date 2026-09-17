"use client";

import { useEffect, useState } from "react";

export function CountUp({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const duration = 700;
    const startTime = performance.now();
    let frame = 0;

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      setDisplayValue(Math.round(value * progress));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    queueMicrotask(() => setDisplayValue(0));
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return displayValue.toLocaleString("en-IN");
}
