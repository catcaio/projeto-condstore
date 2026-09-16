import { redirect } from "next/navigation";

// Temporary placeholder while the full explorer is integrated.
// The interactive Architecture Explorer from caiora/earth-beam-arrow-plum
// will be ported here (graph canvas, catalog, views, Frank, multi-tenancy, etc.).

export default function SitemapPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">CondStore Architecture Explorer</h1>
      <p className="text-muted-foreground max-w-md text-center">
        Página pública em construção. O explorer interativo (grafo de arquitetura,
        views, Frank, multi-tenancy, MVP filter, etc.) será integrado a partir do
        repositório earth-beam-arrow-plum.
      </p>
      <p className="text-sm text-muted-foreground">
        Fonte: https://github.com/caiora/earth-beam-arrow-plum
      </p>
    </div>
  );
}
