import type { Level } from "@/lib/contracts";
import { staticChecks } from "./staticChecks";
self.onmessage = (event: MessageEvent<{output:unknown;level:Level}>) => {
  self.postMessage(staticChecks(event.data.output,event.data.level));
};
