"use client";
import { createContext } from "react";
import type { Preparation } from "../schema";
export interface IntegrityContextValue { stream: MediaStream | null; preparation: Preparation | null; locale: "en" | "id"; paused: boolean; retryMedia(): void }
export const IntegrityContext = createContext<IntegrityContextValue | null>(null);
