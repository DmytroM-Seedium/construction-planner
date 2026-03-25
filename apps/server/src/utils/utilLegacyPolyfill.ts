/**
 * NeDB calls Node's legacy util.isDate / isArray / isRegExp, removed in Node.js 23+.
 * Patch the util singleton before any nedb code runs (same object nedb's require("util") sees).
 */
import util from "node:util";

const u = util as typeof util & {
  isDate?: (obj: unknown) => boolean;
  isArray?: (obj: unknown) => boolean;
  isRegExp?: (obj: unknown) => boolean;
};

if (typeof u.isDate !== "function") {
  u.isDate = (obj: unknown) => obj instanceof Date;
}
if (typeof u.isArray !== "function") {
  u.isArray = Array.isArray;
}
if (typeof u.isRegExp !== "function") {
  u.isRegExp = (obj: unknown) => obj instanceof RegExp;
}
