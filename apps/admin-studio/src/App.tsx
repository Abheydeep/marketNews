import { BrandMark, SentimentBadge } from "@market-narrative/ui";
import type { Permission } from "@market-narrative/api-client";

const requiredPermissions: Permission[] = ["create:script", "generate:assets", "publish:digest"];

export function App() {
  return (
    <main>
      <BrandMark />
      <h1>Studio Command Center</h1>
      <SentimentBadge label="BEARISH" />
      <p>Protected actions require: {requiredPermissions.join(", ")}.</p>
    </main>
  );
}
