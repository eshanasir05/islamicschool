import type { CSSProperties } from 'react';

/**
 * Inline skeleton block. Maps to the existing `.skeleton` sweep animation
 * in globals.css. Use for per-section loading placeholders.
 */
export function Skeleton({
  width,
  height = 14,
  radius,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className="skeleton"
      style={{ width: width ?? '100%', height, borderRadius: radius, ...style }}
    />
  );
}
