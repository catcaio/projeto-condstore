# Sitemap Público (Canônico) - CONDSTORE OS

Este documento funciona como o registry canônico das páginas públicas do CONDSTORE OS. O objetivo é manter o frontend enxuto e alinhado aos "claims" permitidos.

## Auditoria Atual (src/app/(public) e src/app/(marketing))
- **(public)/app**: Rotas de fallback/redirecionamento?
- **(public)/como-funciona**: Roadmap.
- **(public)/cotacao**: Formulário público MVP.
- **(public)/planos**: Roadmap.
- **(public)/produtos**: Roadmap.
- **(marketing)/**: Possível camada conceitual.

## Estrutura Alvo (Sitemap)

| Rota / Página | Status MVP | Escopo | Linear Issue |
| --- | --- | --- | --- |
| `/` (Home) | MVP | Value prop principal, WhatsApp -> Logística. | LIN-PR2 |
| `/produto` e `/como-funciona` | MVP | Detalhamento das 4 fases (Atendimento, Cotação, Pedidos, Cockpit). | LIN-PR3 |
| `/crm-whatsapp` | MVP | Foco em centralização de conversas e copilot Frank. | LIN-PR4 |
| `/logistica` e `/cotacao` | MVP | Foco em frete multicarrier e conversão em pedido. | LIN-PR5 |
| `/cockpit` e `/roi` | MVP | Visão gerencial, dashboards, painéis. | LIN-PR6 |
| `/ia-frank` | MVP | Copiloto supervisionado. | LIN-PR7 |
| `/seguranca` e `/lgpd` | MVP | Isolamento por tenant, criptografia PII. | LIN-PR5 |
| `/piloto` e `/demo` | MVP | CTA principal com tracking. | LIN-PR5 |
| `/faq` | MVP | Perguntas frequentes. | LIN-PR5 |

## Plano de Execução (Próximos PRs)
- **LIN-PR2**: Implementar Home canônica (layout e copy base).
- **LIN-PR3**: Implementar Produto + Como Funciona (copy técnica simplificada).
- **LIN-PR4**: Refinar páginas de CRM/WhatsApp.
- **LIN-PR5**: Refinar Logística, Cotações e Pedidos.
- **LIN-PR6**: Detalhar Cockpit e métricas/ROI.
- **LIN-PR7**: Landing page IA Frank (Foco supervisionado).
- **LIN-PR8**: Segurança, LGPD, Privacidade e Termos (revisão de copy).
- **LIN-PR9**: Página de Piloto / Demo com tracking atualizado.
- **LIN-PR10**: QA Visual, Copy Pass final e Cleanup das pastas não utilizadas.
