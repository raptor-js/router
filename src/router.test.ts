import { assertEquals } from "@std/assert";
import { type Context, HttpMethod, Kernel } from "@raptor/framework";

import Route from "./route.ts";
import Router from "./router.ts";
import RouteGroup from "./route-group.ts";

const APP_URL = "http://localhost:8000";

Deno.test("test router accepts new route", async () => {
  const kernel = new Kernel();
  const router = new Router();

  const route = new Route({
    name: "test.route",
    pathname: "/test-route",
    method: HttpMethod.GET,
    handler: () => ({ success: true }),
  });

  router.add(route);

  kernel.add(router.handle);

  const response = await kernel.respond(
    new Request(`${APP_URL}/test-route`),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), { success: true });
});

Deno.test("test router accepts new routes", async () => {
  const kernel = new Kernel();
  const router = new Router();

  const routeOne = new Route({
    name: "test.route_1",
    pathname: "/test-route-1",
    method: HttpMethod.GET,
    handler: () => ({ route: 1 }),
  });

  const routeTwo = new Route({
    name: "test.route_2",
    pathname: "/test-route-2",
    method: HttpMethod.GET,
    handler: () => ({ route: 2 }),
  });

  router.add([routeOne, routeTwo]);

  kernel.add(router.handle);

  const response1 = await kernel.respond(
    new Request(`${APP_URL}/test-route-1`),
  );

  const response2 = await kernel.respond(
    new Request(`${APP_URL}/test-route-2`),
  );

  assertEquals(await response1.json(), { route: 1 });
  assertEquals(await response2.json(), { route: 2 });
});

Deno.test("test route influences context response", async () => {
  const kernel = new Kernel();

  const router = new Router();

  const route = new Route({
    name: "test.route",
    pathname: "/test-route",
    method: HttpMethod.GET,
    handler: () => {
      return {
        influence: true,
      };
    },
  });

  router.add(route);

  kernel.add(router.handle);

  const response = await kernel.respond(
    new Request(
      `${APP_URL}/test-route`,
    ),
  );

  const body = await response.json();

  assertEquals(body, { influence: true });
});

Deno.test("test unknown route throws not found", async () => {
  const kernel = new Kernel();

  const router = new Router();

  const route = new Route({
    name: "test.route",
    pathname: "/test-route",
    method: HttpMethod.GET,
    handler: () => {
      return {
        influence: true,
      };
    },
  });

  router.add(route);

  kernel.add(router.handle);

  const response = await kernel.respond(
    new Request(
      `${APP_URL}/another-route`,
    ),
  );

  assertEquals(response.status, 404);
});

Deno.test("test context contains route params", async () => {
  const kernel = new Kernel();

  const router = new Router();

  const route = new Route({
    name: "test.route",
    pathname: "/test/:id",
    method: HttpMethod.GET,
    handler: (context: Context) => {
      context.response.headers.set("content-type", "application/json");

      return {
        id: context.request.params.id,
      };
    },
  });

  router.add(route);

  kernel.add(router.handle);

  const response = await kernel.respond(
    new Request(
      `${APP_URL}/test/1`,
    ),
  );

  assertEquals(await response.json(), { id: "1" });
});

Deno.test("test static route lookup performance", async () => {
  const kernel = new Kernel();
  const router = new Router();

  const staticRoute = new Route({
    name: "static.route",
    pathname: "/static",
    method: HttpMethod.GET,
    handler: () => ({ type: "static" }),
  });

  router.add(staticRoute);

  kernel.add(router.handle);

  const response = await kernel.respond(
    new Request(`${APP_URL}/static`),
  );

  assertEquals(await response.json(), { type: "static" });
});

Deno.test("test dynamic route with params", async () => {
  const kernel = new Kernel();
  const router = new Router();

  const dynamicRoute = new Route({
    name: "dynamic.route",
    pathname: "/users/:id/posts/:postId",
    method: HttpMethod.GET,
    handler: (context: Context) => ({
      userId: context.request.params.id,
      postId: context.request.params.postId,
    }),
  });

  router.add(dynamicRoute);

  kernel.add(router.handle);

  const response = await kernel.respond(
    new Request(`${APP_URL}/users/123/posts/456`),
  );

  assertEquals(await response.json(), {
    userId: "123",
    postId: "456",
  });
});

Deno.test("test route with multiple HTTP methods", async () => {
  const kernel = new Kernel();
  const router = new Router();

  const route = new Route({
    name: "multi.method",
    pathname: "/api/resource",
    method: [
      HttpMethod.GET,
      HttpMethod.POST,
    ],
    handler: (context: Context) => ({
      method: context.request.method,
    }),
  });

  router.add(route);

  kernel.add(router.handle);

  const getResponse = await kernel.respond(
    new Request(`${APP_URL}/api/resource`, { method: "GET" }),
  );

  assertEquals(await getResponse.json(), { method: "GET" });

  const postResponse = await kernel.respond(
    new Request(`${APP_URL}/api/resource`, { method: "POST" }),
  );

  assertEquals(await postResponse.json(), { method: "POST" });

  const putResponse = await kernel.respond(
    new Request(`${APP_URL}/api/resource`, { method: "PUT" }),
  );

  assertEquals(putResponse.status, 404);
});

Deno.test("test wildcard route", async () => {
  const kernel = new Kernel();
  const router = new Router();

  const route = new Route({
    name: "docs",
    pathname: "/wildcard/*",
    method: HttpMethod.GET,
    handler: () => ({ matched: "wildcard" }),
  });

  router.add(route);
  kernel.add(router.handle);

  const response = await kernel.respond(
    new Request(`${APP_URL}/wildcard/hello`),
  );

  assertEquals(await response.json(), { matched: "wildcard" });
});

Deno.test("test route middleware", async () => {
  const kernel = new Kernel();
  const router = new Router();

  const route = new Route({
    name: "docs",
    pathname: "/test",
    method: HttpMethod.GET,
    middleware: (context: Context, next: CallableFunction) => {
      context.response.headers.set("Content-Type", "application/hal+json");

      return next();
    },
    handler: () => ({
      hello: "World",
    }),
  });

  router.add(route);

  kernel.add(router.handle);

  const response = await kernel.respond(
    new Request(`${APP_URL}/test`),
  );

  assertEquals(response.headers.get("Content-Type"), "application/hal+json");
});

Deno.test("test route group without middleware", async () => {
  const kernel = new Kernel();
  const router = new Router();

  const group = new RouteGroup({
    name: "api.",
    prefix: "/api",
  });

  group.add([
    new Route({
      name: "index",
      pathname: "/",
      method: HttpMethod.GET,
      handler: () => ({ success: true }),
    }),
  ]);

  router.add(group);

  kernel.add(router.handle);

  const response = await kernel.respond(
    new Request(`${APP_URL}/api`),
  );

  assertEquals(await response.json(), { success: true });
});

Deno.test("test route group with one middleware", async () => {
  const kernel = new Kernel();
  const router = new Router();

  const group = new RouteGroup({
    name: "api.",
    prefix: "/api",
    middleware: (context: Context, next: CallableFunction) => {
      context.response.headers.set("Content-Type", "application/hal+json");

      return next();
    },
  });

  group.add([
    new Route({
      name: "index",
      pathname: "/",
      method: HttpMethod.GET,
      handler: () => ({ success: true }),
    }),
  ]);

  router.add(group);

  kernel.add(router.handle);

  const response = await kernel.respond(
    new Request(`${APP_URL}/api`),
  );

  assertEquals(response.headers.get("Content-Type"), "application/hal+json");
});

Deno.test("test route group with multiple middleware", async () => {
  const kernel = new Kernel();
  const router = new Router();

  const group = new RouteGroup({
    name: "api.",
    prefix: "/api",
    middleware: [
      (context: Context, next: CallableFunction) => {
        context.response.headers.set("Content-Type", "application/hal+json");

        return next();
      },
      (context: Context, next: CallableFunction) => {
        context.response.headers.set("Content-Type", "application/custom+json");

        return next();
      },
    ],
  });

  group.add([
    new Route({
      name: "index",
      pathname: "/",
      method: HttpMethod.GET,
      handler: () => ({ success: true }),
    }),
  ]);

  router.add(group);

  kernel.add(router.handle);

  const response = await kernel.respond(
    new Request(`${APP_URL}/api`),
  );

  assertEquals(response.headers.get("Content-Type"), "application/custom+json");
});
