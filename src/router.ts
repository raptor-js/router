import {
  type Context,
  HttpMethod,
  type Middleware,
  NotFound,
} from "@raptor/kernel";

import Tree from "./tree.ts";
import Route from "./route.ts";
import type { Config } from "./config.ts";
import RouteGroup from "./route-group.ts";
import normalisePath from "./utilities/normalise-path.ts";
import type { RouteConfig } from "./interfaces/route-config.ts";
import type { TreeMatchResult } from "./interfaces/tree-match-result.ts";
import type { RouteGroupConfig } from "./interfaces/route-group-config.ts";

export default class Router {
  /**
   * Internal cache for match results.
   */
  private cache = new Map<string, TreeMatchResult>();

  /**
   * Maximum cache size for the results.
   */
  private maxCacheSize = 1000;

  /**
   * Configuration which can be used to change router functionality.
   */
  private config: Config;

  /**
   * The available trees for the router, by method.
   */
  private trees: Map<HttpMethod, Tree> = new Map();

  /**
   * Initialise the router.
   *
   * @constructor
   */
  constructor(config?: Config) {
    this.config = {
      ...this.initialiseDefaultConfig(),
      ...config,
    };

    if (this.config.routes?.length) {
      this.config.routes.forEach((route) => this.add(route));
    }
  }

  /**
   * Add one or more routes to the router.
   *
   * @param routes One or many routes, either directly or via group(s).
   *
   * @returns void
   */
  public add(
    routes:
      | Route
      | RouteGroup
      | RouteConfig
      | RouteGroupConfig
      | Route[]
      | RouteGroup[]
      | (Route | RouteConfig)[],
  ): void {
    if (this.isRouteConfig(routes)) {
      this.addRoute(new Route(routes as RouteConfig));

      return;
    }

    if (this.isRouteGroupConfig(routes)) {
      this.addRouteGroup(new RouteGroup(routes as RouteGroupConfig));

      return;
    }

    if (Array.isArray(routes) && routes.some((r) => this.isRouteConfig(r))) {
      routes.forEach((route) =>
        this.isRouteConfig(route)
          ? this.addRoute(new Route(route as RouteConfig))
          : this.addRoute(route as Route)
      );

      return;
    }

    if (Array.isArray(routes) && this.isRoute(routes[0])) {
      this.addRoutes(routes as Route[]);

      return;
    }

    if (Array.isArray(routes) && this.isRouteGroup(routes[0])) {
      this.addRouteGroups(routes as RouteGroup[]);

      return;
    }

    if (Array.isArray(routes)) {
      return;
    }

    if (this.isRoute(routes)) {
      this.addRoute(routes as Route);

      return;
    }

    if (this.isRouteGroup(routes)) {
      this.addRouteGroup(routes as RouteGroup);
    }
  }

  /**
   * Add a single route to the router.
   *
   * @param route A single route definition.
   */
  public addRoute(route: Route): void {
    let config = route.config.method;

    if (!config) {
      config = HttpMethod.GET;
    }

    if (Array.isArray(config)) {
      config.forEach((method) => {
        this.createTreeForMethod(method);

        this.trees.get(method)!.add(route);
      });

      return;
    }

    this.createTreeForMethod(config);

    this.trees.get(config)!.add(route);
  }

  /**
   * Add one or more routes to the router.
   *
   * @param routes One or more route definitions.
   */
  public addRoutes(routes: Route[]): void {
    routes.forEach((route) => this.addRoute(route));
  }

  /**
   * Add a single route group to the router.
   *
   * @param group A single group route definition.
   */
  public addRouteGroup(group: RouteGroup): void {
    const { routes } = group;

    this.addRoutes(routes);
  }

  /**
   * Add one or more route groups to the router.
   *
   * @param groups One or more route definitions.
   */
  public addRouteGroups(groups: RouteGroup[]): void {
    groups.forEach((group) => this.addRouteGroup(group));
  }

  /**
   * Wrapper to pre-bind this to the router handler method.
   */
  public get handle(): Middleware {
    return (context: Context, next: CallableFunction) => {
      return this.handleRouting(context, next);
    };
  }

  /**
   * Handle the current http context and process routes.
   *
   * @param context The current http context.
   * @param next The next middleware function.
   *
   * @returns An unknown data type.
   * @throws {NotFound | TypeError}
   */
  public handleRouting(
    context: Context,
    next: CallableFunction,
  ): Promise<unknown> {
    const { request } = context;

    const { method } = request;

    const pathname = this.getPathnameFromUrl(request.url);

    const cacheKey = `${method}:${pathname}`;

    let match;

    // Check cache first for our route.
    if (this.cache.has(cacheKey)) {
      match = this.cache.get(cacheKey)!;
    }

    // If no cache hit, match with tree.
    if (!this.cache.has(cacheKey)) {
      match = this.trees
        .get(HttpMethod[method as keyof typeof HttpMethod])
        ?.match(pathname);
    }

    if (!match && this.config?.throwNotFound) {
      throw new NotFound();
    }

    // Clean up the cache if it's getting too large.
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;

      this.cache.delete(firstKey as string);
    }

    if (match) {
      // Cache the result for later.
      this.cache.set(cacheKey, match);

      // Set the params as part of the context request object.
      context.request.params = match.params;

      // Execute the route's middleware, then finally the handler.
      return this.executeRouteMiddleware(match, context, 0);
    }

    return next();
  }

  /**
   * Initialises the default router options.
   *
   * @returns The default router options.
   */
  public initialiseDefaultConfig(): Config {
    return {
      throwNotFound: true,
      routes: [],
    };
  }

  /**
   * Create a tree for a specific HTTP method.
   *
   * @param method The HTTP method to create tree for.
   */
  private createTreeForMethod(method: HttpMethod) {
    if (!this.trees.has(method)) {
      this.trees.set(method, new Tree());
    }
  }

  /**
   * Check if an object is a route.
   *
   * @param item A route, route group, or their config equivalents.
   *
   * @returns Whether the argument is a route object.
   */
  private isRoute(
    item:
      | Route
      | RouteGroup
      | RouteConfig
      | RouteGroupConfig
      | Route[]
      | RouteGroup[]
      | (Route | RouteConfig)[],
  ): item is Route {
    if (Array.isArray(item)) {
      return false;
    }

    return "config" in item && "method" in item.config;
  }

  /**
   * Check if an object is a route group.
   *
   * @param item A route, route group, or their config equivalents.
   *
   * @returns Whether the argument is a route group object.
   */
  private isRouteGroup(
    item:
      | Route
      | RouteGroup
      | RouteConfig
      | RouteGroupConfig
      | Route[]
      | RouteGroup[]
      | (Route | RouteConfig)[],
  ): item is RouteGroup {
    if (Array.isArray(item)) {
      return false;
    }

    return "routes" in item;
  }

  /**
   * Check if an object is a route configuration.
   *
   * @param item A potential route configuration.
   *
   * @returns Whether the argument is a route config object.
   */
  private isRouteConfig(
    item:
      | Route
      | RouteGroup
      | RouteConfig
      | RouteGroupConfig
      | Route[]
      | RouteGroup[]
      | (Route | RouteConfig)[],
  ): item is RouteConfig {
    if (Array.isArray(item)) {
      return false;
    }

    return (
      "pathname" in item &&
      !("config" in item) &&
      !("routes" in item)
    );
  }

  /**
   * Check if an object is a route group configuration.
   *
   * @param item A potential route group configuration.
   *
   * @returns Whether the argument is a route group config object.
   */
  private isRouteGroupConfig(
    item:
      | Route
      | RouteGroup
      | RouteConfig
      | RouteGroupConfig
      | Route[]
      | RouteGroup[]
      | (Route | RouteConfig)[],
  ): item is RouteGroupConfig {
    if (Array.isArray(item)) {
      return false;
    }

    return (
      "routes" in item &&
      !("pathname" in item) &&
      !("config" in item)
    );
  }

  /**
   * Execute route middleware with next() callback pattern.
   *
   * @param route The route being processed.
   * @param context The context from the request.
   * @param index Current middleware index.
   *
   * @returns The response from handler or middleware.
   */
  private executeRouteMiddleware(
    match: TreeMatchResult,
    context: Context,
    index: number,
  ): Promise<unknown> {
    const config = match.middleware;

    // Simplify by always using an array.
    const middleware = !config ? [] : Array.isArray(config) ? config : [config];

    // If we've executed all middleware, call the route handler.
    if (index >= middleware.length) {
      return Promise.resolve(match.handler(context));
    }

    const current = middleware[index];

    const next = (): Promise<unknown> => {
      return this.executeRouteMiddleware(match, context, index + 1);
    };

    return Promise.resolve(current(context, next));
  }

  /**
   * Get the pathname from the URL.
   *
   * @param url The URL of the request.
   *
   * @returns The pathname extracted from the URL.
   */
  private getPathnameFromUrl(url: string): string {
    const pathStart = url.indexOf("/", 8);

    if (pathStart === -1) {
      throw new NotFound();
    }

    const queryStart = url.indexOf("?", pathStart);
    const hashStart = url.indexOf("#", pathStart);

    let pathEnd = url.length;

    if (queryStart !== -1) {
      pathEnd = queryStart;
    }

    if (hashStart !== -1 && hashStart < pathEnd) {
      pathEnd = hashStart;
    }

    return normalisePath(url.substring(pathStart, pathEnd));
  }
}
