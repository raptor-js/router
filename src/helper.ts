import type { Middleware } from "@raptor/framework";

import Router from "./router.ts";
import type { Config } from "./config.ts";

export default function router(config?: Config): Middleware {
  const instance = new Router(config);

  return instance.handle;
}
