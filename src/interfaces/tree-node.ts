import type { Middleware } from "@raptor/kernel";
import type { RouteHandler } from "./route-handler.ts";

/**
 * An individual node in the tree.
 */
export type TreeNode = {
  pathname: string;
  children: TreeNode[];
  isWildcard: boolean;
  paramName?: string;
  handler?: RouteHandler;
  middleware?: Middleware[];
};
