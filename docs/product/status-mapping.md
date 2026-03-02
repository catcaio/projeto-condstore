# Status Mapping & Normalization

Mapeamentos internos e aglutinadores (Gateways) conectando a infraestrutura "Customer Central" para fornecedores agnósticos operando do ecossistema logístico (Exceção/Transportes).

A taxonomia final trafegada e armazenada nos relatórios `customer_timeline_events` DEVE respeitar a tipologia listada no `status-dictionary.ts`.

---

## 1. Mapeamentos Logísticos (Transportadoras)

### Transportadora A (Exemplo Genérico / Correios)
Status nativos retornados via Webhook / Push -> Normalizados para eventos do Condstore:

| Status Parceiro (Raw) | Status Condstore Interno (Normalized) | Observações Importantes |
| --------------------- | ------------------------------------- | ----------------------- |
| `posted`              | `SHIPMENT_IN_TRANSIT`                 | Pacote recebido na agência. |
| `transit`             | `SHIPMENT_IN_TRANSIT`                 | Em movimento para centro de distribuição local. |
| `out_for_delivery`    | `SHIPMENT_IN_TRANSIT`                 | Mensageiro à caminho (Last Mile). |
| `delivered`           | `SHIPMENT_DELIVERED`                  | Gatilha a emissão do comprovante `delivery_proofs`. |
| `exception`           | `SHIPMENT_EXCEPTION`                  | Endereço não localizado, entre outros sinistros. |
| `returned`            | `SHIPMENT_RETURNED`                   | Retornado fisicamente à Origem. |

### Transportadora B (Stub para Transportadora Rápida X)
(Para uso futuro quando integrado com nova carrier Express tier)

| Status Parceiro (Raw) | Status Condstore Interno (Normalized) | Observações Importantes |
| --------------------- | ------------------------------------- | ----------------------- |
| `TODO`                | `TODO`                                | -                       |

---

## 2. Mapeamentos Financeiros (Boleto/Cartão)
Integrações com Stripe ou Asaas (ou outro PBO provider) são unificados internamente no repositório LGPD para auditoria simples.

| Status do Parceiro | Status Interno | Repercutindo Na UI |
| ------------------- | -------------- | ---------------- |
| `pending`           | `INVOICE_OPEN` | Exibir código de barras copiado. |
| `paid` | `INVOICE_PAID` | - |
| `overdue` | `INVOICE_OVERDUE` | Travar despachos até regularização de compliance financeiro. |

---

> [!CAUTION]
> As strings internas são protegidas via `z.enum(ALL_STATUSES)` nas validações `Zod` do `CustomerTimelineEventSchema`. Nunca introduza um novo status do frontend sem antes alinhar arquiteturalmente o tipo estrito da base.
