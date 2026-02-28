import type Route from "./route.ts";
import type { Middleware } from "@raptor/kernel";
import type { TreeNode } from "./interfaces/tree-node.ts";
import type { TreeMatchResult } from "./interfaces/tree-match-result.ts";

export default class Tree {
  /**
   * The root node of the tree.
   */
  private root: TreeNode = {
    pathname: "",
    children: [],
    isWildcard: false,
  };

  /**
   * Get the root tree node.
   *
   * @returns The root tree node.
   */
  public getRootNode(): TreeNode {
    return this.root;
  }

  /**
   * Add a route to the tree.
   *
   * @param route The route to add to the tree.
   */
  public add(route: Route) {
    let node = this.root;

    const segments = route.config.pathname.split("/").filter((s) => s);

    for (const segment of segments) {
      let child = node.children.find((c) => {
        if (c.pathname === segment) {
          return true;
        }

        if (segment.startsWith(":") && c.paramName) {
          return true;
        }

        return false;
      });

      if (!child) {
        child = {
          pathname: segment,
          children: [],
          isWildcard: segment === "*",
          paramName: segment.startsWith(":") ? segment.slice(1) : undefined,
        };

        node.children.push(child);
      }

      node = child;
    }

    node.handler = route.config.handler;

    node.middleware = this.normaliseMiddleware(
      route.config.middleware,
    );
  }

  /**
   * Match a tree node by path.
   *
   * @param path The path to match against tree nodes.
   * @returns
   */
  public match(path: string): TreeMatchResult | null {
    let node = this.root;

    const segments = path.split("/").filter((s) => s);

    const params: Record<string, string> = {};

    for (const segment of segments) {
      const child = node.children.find((c) => {
        // Do we have an exact pathname match for this segment?
        if (c.pathname === segment) {
          return true;
        }

        // If we're dealing with a parameter.
        if (c.paramName) {
          params[c.paramName] = segment;

          return true;
        }

        return false;
      });

      // If there's no children, handle wildcards.
      if (!child) {
        const wildcard = node.children.find((c) => c.isWildcard);

        if (!wildcard?.handler) {
          return null;
        }

        return {
          handler: wildcard.handler,
          middleware: wildcard.middleware,
          params,
        };
      }

      node = child;
    }

    // If we have no handler, return no match.
    if (!node.handler) {
      return null;
    }

    return {
      handler: node.handler,
      middleware: node.middleware,
      params,
    };
  }

  /**
   * Normalise middleware by converting to an array regardless.
   *
   * @param middleware One or more middleware.
   *
   * @returns An array of defined middleware.
   */
  private normaliseMiddleware(
    middleware?: Middleware | Middleware[],
  ): Middleware[] | undefined {
    return !middleware
      ? []
      : Array.isArray(middleware)
      ? middleware
      : [middleware];
  }
}
