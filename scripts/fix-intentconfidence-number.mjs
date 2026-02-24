import fs from "node:fs";

const f = "src/app/api/webhook/route.ts";
let s = fs.readFileSync(f, "utf8");

// desfaz qualquer toFixed aplicado em intentConfidence e volta pra number|null
s = s.replace(
  /intentConfidence:\s*\(typeof confidence === 'number'\s*\?\s*confidence\.toFixed\(\d+\)\s*:\s*null\)\s*,/g,
  "intentConfidence: (typeof confidence === 'number' ? confidence : null),"
);

// também cobre casos residuais
s = s.replace(
  /intentConfidence:\s*confidence\.toFixed\(\d+\)\s*,/g,
  "intentConfidence: confidence,"
);

fs.writeFileSync(f, s, "utf8");
console.log("OK: intentConfidence back to number|null");
