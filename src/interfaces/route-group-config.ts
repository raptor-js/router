import type { Middleware } from "@raptor/kernel";

import type Route from "../route.ts";
import type { RouteConfig } from "./route-config.ts";

/**
 * The route group configuration options definition.
 */
export interface RouteGroupConfig {
  /**
   * A name prefix to use for the group's routes.
   */
  name?: string;

  /**
   * A path prefix to use for the group's routes.
   */
  prefix?: string;

  /**
   * Optional middleware for the group.
   */
  middleware?: Middleware | Middleware[];

  /**
   * The routes available to the application.
   */
  routes?: (RouteConfig | Route)[];
}
