import type { HttpMethod, Middleware } from "@raptor/kernel";

import type { RouteHandler } from "./route-handler.ts";

/**
 * The route configuration options definition.
 */
export interface RouteConfig {
  /**
   * The name of the route.
   */
  name?: string;

  /**
   * The assigned URL pattern for the route.
   */
  pathname: string;

  /**
   * The HTTP method allowed to the route.
   */
  method?: HttpMethod | HttpMethod[];

  /**
   * Optional middleware for the route.
   */
  middleware?: Middleware | Middleware[];

  /**
   * The handler function when processing the route.
   */
  handler?: RouteHandler;
}
