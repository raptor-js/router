import assert from "node:assert/strict";
import { test } from "node:test";

import normalisePath from "./normalise-path.ts";

test("test normalise paths removes trailing slash", () => {
  const path = "/api/resource/name/";

  const normalised = normalisePath(path);

  assert.deepStrictEqual("/api/resource/name", normalised);
});

test("test normalise paths removes double slash", () => {
  const path = "/api/resource//name";

  const normalised = normalisePath(path);

  assert.deepStrictEqual("/api/resource/name", normalised);
});

test("test normalise paths retains index route", () => {
  const path = "/";

  const normalised = normalisePath(path);

  assert.deepStrictEqual("/", normalised);
});
