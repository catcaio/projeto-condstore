import fs from "node:fs";

function mustWrite(file, next) {
  if (!next || next.length === 0) throw new Error("empty output for " + file);
  fs.writeFileSync(file, next, "utf8");
}

function patchOnce(file, re, replacer) {
  const s = fs.readFileSync(file, "utf8");
  const n = s.replace(re, replacer);
  if (n === s) throw new Error("patch not applied: " + file);
  mustWrite(file, n);
}

function patchMaybe(file, re, replacer) {
  const s = fs.readFileSync(file, "utf8");
  const n = s.replace(re, replacer);
  if (n !== s) mustWrite(file, n);
}

//
// 1) src/app/api/webhook/route.ts
//    TS2322: number not assignable to string -> intentConfidence deve virar string|null
//
{
  const f = "src/app/api/webhook/route.ts";

  // cobre casos: intentConfidence: confidence ?? null
  patchMaybe(
    f,
    /intentConfidence:\s*confidence\s*\?\?\s*null\s*,/g,
    "intentConfidence: (typeof confidence === 'number' ? confidence.toFixed(4) : null),"
  );

  // cobre casos: intentConfidence: confidence,
  patchMaybe(
    f,
    /intentConfidence:\s*confidence\s*,/g,
    "intentConfidence: (typeof confidence === 'number' ? confidence.toFixed(4) : null),"
  );
}

//
// 2) src/infra/repositories/ai-decision-log.repository.ts
//    TS2769 insert mismatch -> confidence deve ser string|null (igual schema atual)
//
{
  const f = "src/infra/repositories/ai-decision-log.repository.ts";

  // substitui qualquer "confidence: input.confidence ?? null"
  patchMaybe(
    f,
    /confidence:\s*input\.confidence\s*\?\?\s*null\s*,/g,
    "confidence: (typeof input.confidence === 'number' ? input.confidence.toFixed(4) : null),"
  );

  // substitui qualquer "confidence: input.confidence,"
  patchMaybe(
    f,
    /confidence:\s*input\.confidence\s*,/g,
    "confidence: (typeof input.confidence === 'number' ? input.confidence.toFixed(4) : null),"
  );
}

//
// 3) src/modules/metrics/context-cache.metrics.ts
//    TS2345: ContextCacheMetricRecord não assignable a LogContext (falta index signature)
//    -> cast explícito para Record<string, unknown>
//
{
  const f = "src/modules/metrics/context-cache.metrics.ts";
  let s = fs.readFileSync(f, "utf8");

  // troca "... , metric)" por "... , (metric as unknown as Record<string, unknown>))"
  // onde o segundo argumento é um identificador simples
  s = s.replace(
    /(logger\.(?:info|warn|error|debug)\([^,]+,\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*\)/g,
    "$1($2 as unknown as Record<string, unknown>))"
  );

  // se não aplicou nada, falha (pra não passar batido)
  if (s === fs.readFileSync(f, "utf8")) {
    throw new Error("logger patch not applied (verifica linha 37): " + f);
  }

  mustWrite(f, s);
}

console.log("OK: patches applied");
