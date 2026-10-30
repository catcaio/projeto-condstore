# PR #427 — correção do Dependency Audit

Base auditada: `629f7ae3b2e2e4efce665bbac698db791de27620`, em 30/10/2026. Escopo: árvore de **produção**, com `npm audit --omit=dev`, igual ao check do GitHub Actions.

O relatório inicial continha 11 entradas vulneráveis: 2 moderadas, 7 altas e 2 críticas. Depois da atualização e de um `npm ci` reproduzível, o mesmo audit retornou **zero vulnerabilidades**, exit 0. Não foi usado `npm audit fix --force`.

## Versões efetivas e origem

| Pacote | Tipo / caminho de produção | Antes | Corrigida |
|---|---|---|---|
| `@sentry/nextjs` | Direta; observabilidade do servidor/browser | 10.73.0 | 10.75.2 |
| `next` | Direta; framework | 16.3.3 | 16.4.1 |
| `nodemailer` | Direta; `src/modules/email/email.service.ts` | 9.1.0 | 10.1.4 |
| `zod` | Direta; validação de entradas | 4.3.6 | 4.6.6 |
| `brace-expansion` | Transitiva: Sentry → bundler → glob → minimatch | 5.0.9 | 5.0.12 |
| `fast-uri` | Transitiva: Sentry → webpack → schema-utils → ajv | 3.1.6 | 3.1.9 |
| `follow-redirects` | Transitiva: axios | 1.16.0 | 1.16.1 |
| `postcss-selector-parser` | Transitiva: tailwindcss-animate → tailwindcss | 7.1.5 | 7.1.6 |
| `qs` | Transitiva: twilio | 6.16.0 | 6.16.1 |
| `sharp` | Transitiva opcional: Next → sharp/libvips | 0.35.4 | 0.35.5 |
| `source-map-js` | Transitiva: Next/PostCSS e Tailwind/PostCSS | 1.2.1 | 1.2.2 |

Todos constavam da árvore de produção auditada, inclusive ferramentas empacotadas por dependências diretas. Isso não significa que todo vetor descrito pelos advisories esteja exposto na configuração do aplicativo. Não foi encontrada configuração de `tunnelRoute` do Sentry, por exemplo; a dependência foi atualizada mesmo assim.

As versões diretas corrigidas foram fixadas explicitamente. Overrides anteriores vulneráveis foram atualizados; foram acrescentadas versões corrigidas de `qs` e `source-map-js`, cujas versões antigas ainda satisfaziam os ranges dos pais e continuavam presas no lock. O Sharp corrigido é resolvido pelo próprio Next, sem override global novo. Os binários opcionais de SWC/Sharp e dependências internas do Sentry acompanham suas versões.

## Necessidade e compatibilidade do Nodemailer 10

As correções publicadas dos avisos capturados exigem Nodemailer 10.1.4; permanecer no major 9 não eliminaria esses avisos. O novo piso Node 20 não aumenta o piso efetivo deste projeto, já fixado pelo Next em Node >=20.9.

O serviço usa somente `createTransport` com host/porta/secure/auth e `sendMail` com destinatário, assunto, HTML, texto e reply-to. Esse contrato foi preservado. O pacote 10 inclui suas próprias declarações; a referência antiga ao namespace `nodemailer.Transporter` não compila. A única adaptação no serviço foi importar `type Transporter` explicitamente. O pacote de tipos antigo e redundante foi removido.

O teste `src/modules/email/__tests__/transport-compatibility.test.ts` usa o EmailService e Nodemailer reais contra um servidor SMTP de loopback, porta efêmera, sem relay externo. Verifica autenticação, envelope com um destinatário, MIME HTML/text, `messageId` e falha em produção quando nenhum provider está configurado. Credenciais sintéticas são geradas em memória e removidas ao encerrar o teste.

Esse teste passou em 2/2 casos. Não comprova envio contra um servidor SMTP produtivo. O Nodemailer 10 possui diferenças de timeout e semântica de erros em caminhos não usados pelo serviço atual; nenhum comportamento comercial ou fluxo de envio foi reescrito para a atualização.

## Evidências e limites

- `npm ci --no-audit --no-fund`: instalação a partir do lock concluída.
- `npm audit --omit=dev --json`: zero entradas, exit 0, na árvore instalada.
- Sharp 0.35.5/libvips 8.18.7: conversão local SVG → PNG 2×2 e leitura dos metadados aprovadas.
- Testes SMTP de loopback: 2/2 aprovados; nenhum e-mail externo.
- Typecheck global aprovado após a troca de dependências.
- Build, testes amplos e gates finais são registrados no relatório de entrega da PR.

Não há vulnerabilidade remanescente entre as 11 entradas de produção auditadas. O resultado é temporal e restrito ao banco de advisories consultado pelo npm. Não é uma declaração de ausência de vulnerabilidades desconhecidas nem um audit de todas as dependências de desenvolvimento.

## Fontes primárias

- [Next: versão corrigida 16.4.1](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw).
- [Sentry: versão corrigida 10.75.2](https://github.com/getsentry/sentry-javascript/security/advisories/GHSA-mchm-gjx6-7h55).
- [Zod: versão corrigida 4.6.6](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
- [Sharp/libvips](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w).
- [Nodemailer: changelog do major 10](https://github.com/nodemailer/nodemailer/blob/v10.0.0/CHANGELOG.md).
- [Nodemailer 10.1.4: declarações e implementação](https://github.com/nodemailer/nodemailer/blob/v10.1.4/src/nodemailer.ts).

Os IDs, ranges e demais advisories individuais são preservados no JSON inicial do audit entregue junto às evidências.
