import type Route from "./route.ts";
import type RouteGroup from "./route-group.ts";

export interface Config {
  /**
   * Whether the router should throw a 404 Not Found error when no route
   * matches the incoming request. When false, the request is passed to
   * the next middleware instead.
   */
  throwNotFound?: boolean;

  /**
   * The routes and route groups available to the application.
   */
  routes?: (Route | RouteGroup)[];
}
