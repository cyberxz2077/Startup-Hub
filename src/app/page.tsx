import { Suspense } from "react";
import { HubApp } from "@/components/HubApp";
export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-ink-light">
          正在加载 Startup Hub…
        </div>
      }
    >
      <HubApp />
    </Suspense>
  );
}
