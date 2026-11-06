import type { Params } from "./interfaces/params.ts";

declare global {
  interface Request {
    params: Params;
  }
}

export {};
