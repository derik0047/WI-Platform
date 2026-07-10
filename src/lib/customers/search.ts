/**
 * Customer search helpers. The implementation now lives in the shared
 * `lib/search` module (reused by invoices); re-exported here so existing imports
 * remain stable.
 */
export { containsPattern, escapeLike } from "@/lib/search";
