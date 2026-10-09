import type { CSSProperties } from "react";
export const ACCENT_COLORS = [
  { key: "pine", name: "Pine", hex: "#1F5F4F" },
  { key: "terracotta", name: "Terracotta", hex: "#B4533C" },
  { key: "ochre", name: "Ochre", hex: "#8F6212" },
  { key: "slate", name: "Slate", hex: "#2F5D7C" },
  { key: "brick", name: "Brick", hex: "#A6323A" },
  { key: "charcoal", name: "Charcoal", hex: "#3A3733" },
] as const;
export function resolveAccent(value: string | null | undefined) { return ACCENT_COLORS.find((color) => color.hex.toLowerCase() === value?.toLowerCase()) ?? ACCENT_COLORS[0]; }
export function accentStyle(hex: string): CSSProperties & Record<`--${string}`, string> { return { "--primary": hex, "--ring": hex, "--primary-foreground": "#FFFFFF" }; }
