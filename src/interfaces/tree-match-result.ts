import type { Middleware } from "@raptor/types";
import type { RouteHandler } from "../interfaces/route-handler.ts";

/**
 * An individual tree match result.
 */
export type TreeMatchResult = {
  handler: RouteHandler;
  params: Record<string, string>;
  middleware?: Middleware[];
};
