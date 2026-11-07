import { clsx } from "clsx";
import type { ButtonSize, ButtonVariant } from "./types";

// Links share the button appearance without changing Button's frozen native-button props.
export function buttonStyles(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string): string {
  return clsx("he-button", `he-button--${variant}`, `he-button--${size}`, className);
}
