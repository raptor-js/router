import Route from "./route.ts";
import normalisePath from "./utilities/normalise-path.ts";
import type { RouteConfig } from "./interfaces/route-config.ts";
import type { RouteGroupConfig } from "./interfaces/route-group-config.ts";

/**
 * The route group definition.
 */
export default class RouteGroup {
  /**
   * A configurable option set for a route.
   */
  config: RouteGroupConfig;

  /**
   * All stored routes for the group.
   */
  routes: Route[] = [];

  /**
   * @constructor
   * @param config The route group config.
   */
  constructor(config: RouteGroupConfig) {
    this.config = config;

    if (this.config.routes?.length) {
      this.add(this.config.routes);
    }
  }

  /**
   * Add a route or routes to the group.
   *
   * @param routes The route or routes to add to the group.
   */
  public add(routes: RouteConfig | Route | (RouteConfig | Route)[]) {
    if (Array.isArray(routes)) {
      this.addRoutes(routes);

      return;
    }

    this.addRoute(this.isRouteConfig(routes) ? new Route(routes) : routes);
  }

  /**
   * Add an individual route to the group.
   *
   * @param route The route to add to the group.
   */
  public addRoute(route: Route) {
    const { name, prefix, middleware } = this.config;

    // Attach any name prefixes from the group.
    if (name) {
      route.config.name = name + route.config.name;
    }

    // Attach any pathname prefixes from the group.
    if (prefix) {
      const pathname = `${prefix}/${route.config.pathname}`;

      route.config.pathname = normalisePath(pathname);
    }

    // Attach any middleware from the group.
    if (middleware) {
      const normalised = Array.isArray(middleware) ? middleware : [middleware];

      const routeMiddleware = route.config.middleware
        ? (Array.isArray(route.config.middleware)
          ? route.config.middleware
          : [route.config.middleware])
        : [];

      route.config.middleware = [
        ...normalised,
        ...routeMiddleware,
      ];
    }

    this.routes.push(route);
  }

  /**
   * Add multiple routes to a group.
   *
   * @param routes The routes to add to the group.
   */
  public addRoutes(routes: (RouteConfig | Route)[]) {
    routes.forEach((route) =>
      this.addRoute(this.isRouteConfig(route) ? new Route(route) : route)
    );
  }

  /**
   * Check if an item is a route config object.
   *
   * @param item The item to check against.
   *
   * @returns A boolean indicating whether it is route config or not.
   */
  private isRouteConfig(
    item: RouteConfig | Route,
  ): item is RouteConfig {
    return "pathname" in item && !("config" in item);
  }
}
