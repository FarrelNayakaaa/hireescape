import type { DefectType } from "@/lib/contracts";
export const triageHints: Record<DefectType, string> = {
  swallowed_exception: "Look at what happens after something goes wrong.",
  unhandled_null: "Look at data that comes from outside this file.",
  cache_no_fallback: "Look at what the request depends on that can fail.",
  off_by_one: "Look at the edges: the exact value where behaviour changes.",
  shared_mutation: "Look at who owns the data this function receives.",
  missing_await: "Look at the order things finish, not the order they start.",
  unbounded_retry: "Look at which failures are worth trying again.",
  resource_leak: "Look at every way this function can end.",
};
