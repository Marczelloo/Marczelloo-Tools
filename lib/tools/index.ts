/**
 * Tool Module Types
 * Per CLAUDE.md Section 3 - Tool Module System
 */

import { z } from "zod";

export type LayoutType = "upload-center" | "split-panel" | "form-heavy" | "live-playground";

export interface ToolLimits {
  maxFileSize: number; // bytes
  maxDuration: number; // seconds
  timeout: number; // ms
  concurrencyWeight: number;
}

export interface ToolConfig {
  id: string;
  category: string;
  accent: string;
  layout: LayoutType;
  limits: ToolLimits;
  enabled: boolean;
}

export interface ToolModule {
  config: ToolConfig;
  schema: z.ZodType<unknown>;
  processor: (input: unknown) => Promise<unknown>;
}
