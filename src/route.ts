import { HttpMethod } from "@raptor/framework";
import type { Params } from "./interfaces/params.ts";
import type { RouteOptions } from "./interfaces/route-options.ts";

/**
 * The route definition.
 */
export default class Route {
  /**
   * A configurable option set for a route.
   */
  options: RouteOptions;

  /**
   * Stored compiled pattern for router.
   */
  pattern: URLPattern;

  /**
   * Stored compiled param regex.
   */
  paramRegex?: RegExp;

  /**
   * Stored compiled param names.
   */
  paramNames?: string[];

  /**
   * Initialise a route object.
   *
   * @constructor
   * @param options The options for the route.
   */
  constructor(options: RouteOptions) {
    this.options = {
      ...{
        method: HttpMethod.GET,
      },
      ...options,
    };

    this.pattern = this.buildPattern();

    if (this.hasDynamicSegments()) {
      this.buildParamRegex();
    }
  }

  /**
   * Extract parameters from a URL.
   *
   * @param url The URL to extract parameters from.
   * @returns The extracted parameters.
   */
  public extractParams(url: URL): Params {
    if (!this.paramRegex || !this.paramNames || this.paramNames.length === 0) {
      return {};
    }

    const match = url.pathname.match(this.paramRegex);

    if (!match) {
      return {};
    }

    const params: Params = {};

    this.paramNames.forEach((name, index) => {
      const value = match[index + 1];

      if (name === "*") {
        params["*"] = value?.replace(/^\//, "") || "";
        return;
      }

      params[name] = value;
    });

    return params;
  }

  /**
   * Check if the route has dynamic segments (params or wildcards).
   *
   * @returns Boolean indicating whether the route has dynamic segments.
   */
  private hasDynamicSegments(): boolean {
    return this.options.pathname.includes(":") ||
      this.options.pathname.includes("*");
  }

  /**
   * Build the URL pattern for this route.
   *
   * @returns The compiled URL pattern.
   */
  private buildPattern(): URLPattern {
    return new URLPattern({
      pathname: this.options.pathname,
    });
  }

  /**
   * Build the param regex and param names for dynamic routes.
   */
  private buildParamRegex(): void {
    const segments: string[] = [];

    const regexPattern = this.options.pathname
      .replace(/\/:([^\/]+)/g, (_match, name) => {
        segments.push(name);
        return "/([^/]+)";
      })
      .replace(/\/\*/g, () => {
        segments.push("*");
        return "(/.*)?";
      });

    this.paramRegex = new RegExp(`^${regexPattern}$`);
    this.paramNames = segments;
  }
}
