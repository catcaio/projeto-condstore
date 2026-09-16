"use client";

import "@/modules/architecture-explorer/explorer.css";
import { ExplorerApp } from "@/modules/architecture-explorer/components/explorer-app";
import { Suspense } from "react";

export default function Sitemap2Page() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-zinc-950 text-zinc-400 text-sm">
          Carregando Architecture Explorer…
        </div>
      }
    >
      <ExplorerApp />
    </Suspense>
  );
}
