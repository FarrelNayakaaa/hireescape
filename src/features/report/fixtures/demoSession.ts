import type { Session, IntegrityRecord, SessionEvent, EventDataMap } from "@/lib/contracts";
type DemoEvent = { [T in keyof EventDataMap]: Omit<SessionEvent,"type"|"data"> & {type:T;data:EventDataMap[T]} }[keyof EventDataMap];
export const demoStarterCode="// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    const cached = await cache.get(cacheKey(id));\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS);\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n";
export const demoSession:Session={
  "id": "demo-rani",
  "assessmentId": "demo-rani-assessment",
  "challengeId": "seed-cache-no-fallback-mid",
  "aiAssistance": true,
  "startedAt": "2026-11-07T00:00:00.000Z",
  "endedAt": "2026-11-07T00:11:01.000Z",
  "endReason": "escaped",
  "events": [
    {
      "id": "e1",
      "t": 0,
      "room": 0,
      "type": "session_start",
      "data": {
        "aiAssistance": true,
        "level": "mid",
        "defectType": "cache_no_fallback"
      }
    },
    {
      "id": "e2",
      "t": 1000,
      "room": 0,
      "type": "rules_ack",
      "data": {}
    },
    {
      "id": "e3",
      "t": 2000,
      "room": 1,
      "type": "room_enter",
      "data": {
        "room": 1
      }
    },
    {
      "id": "e4",
      "t": 41000,
      "room": 1,
      "type": "triage_mark",
      "text": "cache.get throws on timeout and nothing catches it",
      "data": {
        "start": 14,
        "end": 16
      }
    },
    {
      "id": "e5",
      "t": 42000,
      "room": 1,
      "type": "triage_result",
      "data": {
        "correct": true,
        "assisted": false,
        "attempt": 1
      }
    },
    {
      "id": "e6",
      "t": 45000,
      "room": 1,
      "type": "test_run",
      "data": {
        "visible": {
          "passed": 2,
          "total": 2
        },
        "hidden": {
          "passed": 3,
          "total": 6,
          "failedNames": [
            "cache.get failure",
            "cache.set failure",
            "cache warning"
          ]
        },
        "timedOut": false,
        "runtimeError": null,
        "codeHash": "fixture-3"
      }
    },
    {
      "id": "e7",
      "t": 50000,
      "room": 1,
      "type": "room_complete",
      "data": {
        "room": 1,
        "durationSec": 48
      }
    },
    {
      "id": "e8",
      "t": 51000,
      "room": 2,
      "type": "room_enter",
      "data": {
        "room": 2
      }
    },
    {
      "id": "e9",
      "t": 60000,
      "room": 2,
      "type": "edit",
      "data": {
        "linesChanged": 1,
        "source": "manual"
      }
    },
    {
      "id": "e10",
      "t": 90000,
      "room": 2,
      "type": "edit",
      "data": {
        "linesChanged": 1,
        "source": "manual"
      }
    },
    {
      "id": "e11",
      "t": 100000,
      "room": 2,
      "type": "test_run",
      "data": {
        "visible": {
          "passed": 2,
          "total": 2
        },
        "hidden": {
          "passed": 3,
          "total": 6,
          "failedNames": [
            "cache.get failure",
            "cache.set failure",
            "cache warning"
          ]
        },
        "timedOut": false,
        "runtimeError": null,
        "codeHash": "fixture-3"
      }
    },
    {
      "id": "e12",
      "t": 372000,
      "room": 2,
      "type": "assistant_prompt",
      "text": "why would getProduct fail when the cache times out? only fix the get path",
      "data": {
        "chars": 78
      }
    },
    {
      "id": "e13",
      "t": 379000,
      "room": 2,
      "type": "assistant_response",
      "text": "Separate cache.get failures and keep repository errors visible.",
      "data": {
        "suggestionId": "s1",
        "suggestionLines": 39
      }
    },
    {
      "id": "e14",
      "t": 400000,
      "room": 2,
      "type": "ai_diff_view",
      "data": {
        "suggestionId": "s1"
      }
    },
    {
      "id": "e15",
      "t": 418000,
      "room": 2,
      "type": "ai_apply",
      "data": {
        "suggestionId": "s1",
        "linesAdded": 9,
        "linesRemoved": 1,
        "reviewedFirst": true
      }
    },
    {
      "id": "e16",
      "t": 450000,
      "room": 2,
      "type": "edit",
      "data": {
        "linesChanged": 1,
        "source": "manual"
      }
    },
    {
      "id": "e17",
      "t": 461000,
      "room": 2,
      "type": "test_run",
      "data": {
        "visible": {
          "passed": 2,
          "total": 2
        },
        "hidden": {
          "passed": 5,
          "total": 6,
          "failedNames": [
            "cache.set failure"
          ]
        },
        "timedOut": false,
        "runtimeError": null,
        "codeHash": "fixture-5"
      }
    },
    {
      "id": "e18",
      "t": 470000,
      "room": 2,
      "type": "assistant_prompt",
      "text": "Handle cache.set failure without swallowing repository failures.",
      "data": {
        "chars": 65
      }
    },
    {
      "id": "e19",
      "t": 480000,
      "room": 2,
      "type": "assistant_response",
      "text": "Suggested cache write fallback.",
      "data": {
        "suggestionId": "s2",
        "suggestionLines": 41
      }
    },
    {
      "id": "e20",
      "t": 500000,
      "room": 2,
      "type": "ai_apply",
      "data": {
        "suggestionId": "s2",
        "linesAdded": 8,
        "linesRemoved": 2,
        "reviewedFirst": false
      }
    },
    {
      "id": "e21",
      "t": 510000,
      "room": 2,
      "type": "test_run",
      "data": {
        "visible": {
          "passed": 2,
          "total": 2
        },
        "hidden": {
          "passed": 4,
          "total": 6,
          "failedNames": [
            "repository errors propagate",
            "cache.set failure"
          ]
        },
        "timedOut": false,
        "runtimeError": null,
        "codeHash": "fixture-4"
      }
    },
    {
      "id": "e22",
      "t": 530000,
      "room": 2,
      "type": "inquisitor_question",
      "text": "What should happen when the repository fails?",
      "data": {
        "mode": "nudge",
        "intent": "failure_mode",
        "line": 24,
        "quote": "repo.findById",
        "defenceIndex": null
      }
    },
    {
      "id": "e23",
      "t": 535000,
      "room": 2,
      "type": "candidate_answer",
      "text": "The suggestion hides repository failures. I need to keep those errors visible.",
      "data": {
        "questionEventId": "e22"
      }
    },
    {
      "id": "e24",
      "t": 550000,
      "room": 2,
      "type": "edit",
      "data": {
        "linesChanged": 1,
        "source": "manual"
      }
    },
    {
      "id": "e25",
      "t": 555000,
      "room": 2,
      "type": "paste",
      "data": {
        "chars": 72,
        "lines": 1,
        "matchesSuggestionId": null
      }
    },
    {
      "id": "e26",
      "t": 557000,
      "room": 2,
      "type": "edit",
      "data": {
        "linesChanged": 1,
        "source": "manual"
      }
    },
    {
      "id": "e27",
      "t": 559000,
      "room": 2,
      "type": "edit",
      "data": {
        "linesChanged": 1,
        "source": "manual"
      }
    },
    {
      "id": "e28",
      "t": 560000,
      "room": 2,
      "type": "test_run",
      "data": {
        "visible": {
          "passed": 2,
          "total": 2
        },
        "hidden": {
          "passed": 6,
          "total": 6,
          "failedNames": []
        },
        "timedOut": false,
        "runtimeError": null,
        "codeHash": "fixture-6"
      }
    },
    {
      "id": "e29",
      "t": 565000,
      "room": 2,
      "type": "ai_diff_view",
      "data": {
        "suggestionId": "s2"
      }
    },
    {
      "id": "e30",
      "t": 570000,
      "room": 2,
      "type": "test_run",
      "data": {
        "visible": {
          "passed": 2,
          "total": 2
        },
        "hidden": {
          "passed": 6,
          "total": 6,
          "failedNames": []
        },
        "timedOut": false,
        "runtimeError": null,
        "codeHash": "fixture-6"
      }
    },
    {
      "id": "e31",
      "t": 590000,
      "room": 2,
      "type": "room_complete",
      "data": {
        "room": 2,
        "durationSec": 539
      }
    },
    {
      "id": "e32",
      "t": 591000,
      "room": 3,
      "type": "room_enter",
      "data": {
        "room": 3
      }
    },
    {
      "id": "e33",
      "t": 600000,
      "room": 3,
      "type": "inquisitor_question",
      "text": "Why is the repository call outside the cache catch?",
      "data": {
        "mode": "defence",
        "intent": "failure_mode",
        "line": 24,
        "quote": "repo.findById",
        "defenceIndex": 0
      }
    },
    {
      "id": "e34",
      "t": 610000,
      "room": 3,
      "type": "candidate_answer",
      "text": "The cache is optional; repository errors still propagate.",
      "data": {
        "questionEventId": "e33"
      }
    },
    {
      "id": "e35",
      "t": 620000,
      "room": 3,
      "type": "inquisitor_question",
      "text": "Which log fields help diagnose a cache incident?",
      "data": {
        "mode": "defence",
        "intent": "observability",
        "line": 18,
        "quote": "logger.warn",
        "defenceIndex": 1
      }
    },
    {
      "id": "e36",
      "t": 630000,
      "room": 3,
      "type": "candidate_answer",
      "text": "I log the operation and product id so a cache incident is diagnosable.",
      "data": {
        "questionEventId": "e35"
      }
    },
    {
      "id": "e37",
      "t": 640000,
      "room": 3,
      "type": "inquisitor_question",
      "text": "What would you test before deploying this during a flash sale?",
      "data": {
        "mode": "defence",
        "intent": "tradeoff",
        "line": 3,
        "quote": "TTL_SECONDS",
        "defenceIndex": 2
      }
    },
    {
      "id": "e38",
      "t": 650000,
      "room": 3,
      "type": "candidate_answer",
      "text": "A timeout budget and circuit breaker would need load tests before rollout.",
      "data": {
        "questionEventId": "e37"
      }
    },
    {
      "id": "e39",
      "t": 660000,
      "room": 3,
      "type": "room_complete",
      "data": {
        "room": 3,
        "durationSec": 69
      }
    },
    {
      "id": "e40",
      "t": 661000,
      "room": 3,
      "type": "session_end",
      "data": {
        "reason": "escaped"
      }
    }
  ] satisfies DemoEvent[],
  "snapshots": [
    {
      "eventId": "e1",
      "t": 0,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    const cached = await cache.get(cacheKey(id));\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS);\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e2",
      "t": 1000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    const cached = await cache.get(cacheKey(id));\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS);\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e3",
      "t": 2000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    const cached = await cache.get(cacheKey(id));\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS);\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e4",
      "t": 41000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    const cached = await cache.get(cacheKey(id));\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS);\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e5",
      "t": 42000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    const cached = await cache.get(cacheKey(id));\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS);\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e6",
      "t": 45000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    const cached = await cache.get(cacheKey(id));\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS);\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e7",
      "t": 50000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    const cached = await cache.get(cacheKey(id));\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS);\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e8",
      "t": 51000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    const cached = await cache.get(cacheKey(id));\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS);\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e9",
      "t": 60000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    const cached = await cache.get(cacheKey(id));\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS);\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Investigating cache dependency failures."
    },
    {
      "eventId": "e10",
      "t": 90000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    const cached = await cache.get(cacheKey(id));\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS);\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Investigating cache dependency failures.\n// Keep the repository path observable."
    },
    {
      "eventId": "e11",
      "t": 100000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    const cached = await cache.get(cacheKey(id));\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS);\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Investigating cache dependency failures.\n// Keep the repository path observable."
    },
    {
      "eventId": "e12",
      "t": 372000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    const cached = await cache.get(cacheKey(id));\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS);\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Investigating cache dependency failures.\n// Keep the repository path observable."
    },
    {
      "eventId": "e13",
      "t": 379000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    const cached = await cache.get(cacheKey(id));\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS);\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Investigating cache dependency failures.\n// Keep the repository path observable."
    },
    {
      "eventId": "e14",
      "t": 400000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    const cached = await cache.get(cacheKey(id));\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS);\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Investigating cache dependency failures.\n// Keep the repository path observable."
    },
    {
      "eventId": "e15",
      "t": 418000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS); catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e16",
      "t": 450000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, using repository fallback\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS); catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e17",
      "t": 461000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, using repository fallback\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS); catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e18",
      "t": 470000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, using repository fallback\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS); catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e19",
      "t": 480000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, using repository fallback\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS); catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e20",
      "t": 500000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id).catch(() => null);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e21",
      "t": 510000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id).catch(() => null);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e22",
      "t": 530000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id).catch(() => null);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e23",
      "t": 535000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id).catch(() => null);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e24",
      "t": 550000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n"
    },
    {
      "eventId": "e25",
      "t": 555000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal."
    },
    {
      "eventId": "e26",
      "t": 557000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal.\n// Keep retries outside this boundary."
    },
    {
      "eventId": "e27",
      "t": 559000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal.\n// Keep retries outside this boundary.\n// Observe cache incidents independently."
    },
    {
      "eventId": "e28",
      "t": 560000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal.\n// Keep retries outside this boundary.\n// Observe cache incidents independently."
    },
    {
      "eventId": "e29",
      "t": 565000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal.\n// Keep retries outside this boundary.\n// Observe cache incidents independently."
    },
    {
      "eventId": "e30",
      "t": 570000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal.\n// Keep retries outside this boundary.\n// Observe cache incidents independently."
    },
    {
      "eventId": "e31",
      "t": 590000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal.\n// Keep retries outside this boundary.\n// Observe cache incidents independently."
    },
    {
      "eventId": "e32",
      "t": 591000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal.\n// Keep retries outside this boundary.\n// Observe cache incidents independently."
    },
    {
      "eventId": "e33",
      "t": 600000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal.\n// Keep retries outside this boundary.\n// Observe cache incidents independently."
    },
    {
      "eventId": "e34",
      "t": 610000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal.\n// Keep retries outside this boundary.\n// Observe cache incidents independently."
    },
    {
      "eventId": "e35",
      "t": 620000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal.\n// Keep retries outside this boundary.\n// Observe cache incidents independently."
    },
    {
      "eventId": "e36",
      "t": 630000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal.\n// Keep retries outside this boundary.\n// Observe cache incidents independently."
    },
    {
      "eventId": "e37",
      "t": 640000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal.\n// Keep retries outside this boundary.\n// Observe cache incidents independently."
    },
    {
      "eventId": "e38",
      "t": 650000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal.\n// Keep retries outside this boundary.\n// Observe cache incidents independently."
    },
    {
      "eventId": "e39",
      "t": 660000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal.\n// Keep retries outside this boundary.\n// Observe cache incidents independently."
    },
    {
      "eventId": "e40",
      "t": 661000,
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal.\n// Keep retries outside this boundary.\n// Observe cache incidents independently."
    }
  ],
  "lineOrigins": [
    "starter",
    "starter",
    "starter",
    "starter",
    "starter",
    "starter",
    "starter",
    "starter",
    "starter",
    "starter",
    "starter",
    "starter",
    "starter",
    "ai",
    "ai",
    "ai",
    "ai",
    "ai",
    "ai",
    "starter",
    "starter",
    "starter",
    "starter",
    "ai_edited",
    "starter",
    "starter",
    "starter",
    "starter",
    "ai",
    "ai",
    "ai",
    "ai",
    "ai",
    "starter",
    "starter",
    "starter",
    "starter",
    "starter",
    "starter",
    "starter",
    "starter",
    "paste",
    "manual",
    "manual"
  ],
  "suggestions": [
    {
      "id": "s1",
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    await cache.set(cacheKey(id), product, TTL_SECONDS); catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n",
      "summary": "Isolate cache.get failures",
      "promptEventId": "e12",
      "responseEventId": "e13"
    },
    {
      "id": "s2",
      "code": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id).catch(() => null);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n",
      "summary": "Cache write fallback",
      "promptEventId": "e18",
      "responseEventId": "e19"
    }
  ],
  "finalCode": "// productService.js\nfunction createProductService({ cache, repo, logger }) {\n  const TTL_SECONDS = 60;\n\n  function cacheKey(id) {\n    return `product:${id}`;\n  }\n\n  async function getProduct(id) {\n    if (!id) {\n      throw new Error(\"id is required\");\n    }\n\n    let cached = null;\n    try {\n      cached = await cache.get(cacheKey(id));\n    } catch (err) {\n      logger.warn(\"cache.get failed, falling back to repo\", { id, error: err.message });\n    }\n    if (cached) {\n      return { ...cached, source: \"cache\" };\n    }\n\n    const product = await repo.findById(id);\n    if (!product) {\n      return null;\n    }\n\n    try {\n      await cache.set(cacheKey(id), product, TTL_SECONDS);\n    } catch (err) {\n      logger.warn(\"cache.set failed\", { id, error: err.message });\n    }\n    return { ...product, source: \"db\" };\n  }\n\n  return { getProduct };\n}\n\nmodule.exports = { createProductService };\n\n// Repository failures remain visible; cache failures are non-fatal.\n// Keep retries outside this boundary.\n// Observe cache incidents independently."
};
export const demoIntegrity:IntegrityRecord={
  "sessionId": "demo-rani",
  "mode": "browser",
  "consent": "not_required",
  "calibration": {
    "faceOk": null,
    "noiseFloor": null,
    "fullscreen": null
  },
  "signals": [
    {
      "id": "i1",
      "type": "tab_hidden",
      "start": 270000,
      "end": 282000,
      "durationMs": 12000,
      "room": 2
    }
  ],
  "summary": {
    "counts": {
      "tab_hidden": 1
    },
    "totalsMs": {
      "tab_hidden": 12000
    },
    "reviewSuggested": false,
    "reasons": [],
    "caveats": [
      "A hidden tab is a signal for human review, not evidence of intent."
    ]
  }
};
