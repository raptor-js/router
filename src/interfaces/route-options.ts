import type { HttpMethod, Middleware } from "@raptor/framework";

import type { RouteHandler } from "./route-handler.ts";

/**
 * The route options definition.
 */
export interface RouteOptions {
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
