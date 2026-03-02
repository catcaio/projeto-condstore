# Customer Central: Visão Arquitetural e Modelagem

Uma visão unificada sobre a Central do Comprador dentro do ecossistema CONDSTORE OS.

## 1. Visão do Produto
A Central do Comprador serve a interface (UX) unificada para empresas B2B. O objetivo é fornecer acesso corporativo (sem conflito lógico B2C) para acompanhamento de Cotações, Pedidos, Rastreamento Logístico (Entregas), Faturamento (Boleto/Invoices) e Histórico de Relatórios.
O público alvo são `CustomerAccounts` detentores de filiais (`organizations`).

## 2. Entidades Fundacionais
A modelagem relacional centraliza fluxos operacionais nas views transacionais garantindo proteção por tenant. As seguintes estruturas mapeiam a base em `src/drizzle/schema.ts`:
- **Organizations**: Corresponde hierarquicamente a CNPJs de nível raiz para gestão mestre global (Hashed CNPJ previne interceptação plaintext PII).
- **Sites**: Condomínios e Unidades atreladas verticalmente e hierarquicamente às Organizações.
- **Customer_Accounts**: Vínculos lógicos amarrando Logins Identitários (Auth JWT) e Múltiplos Tenants às Organizações por meio de níveis estritos `(OWNER, MANAGER, EMPLOYEE)`.
- **Customer_Timeline_Events**: O hub auditável single-source contendo PII redactions assíncronos sobre os domínios macro do sistema.
- **Invoices & Delivery_Proofs**: Links referenciais contendo comprovantes físicos da operação.

## 3. Dicionário de Status Unificado
Todos os status de processamento da camada transacional B2B convergem para um único file tipado no repositório.
**Referência do Código**: `src/domain/status/status-dictionary.ts`

Domínios padronizados:
- `ORDER_STATUS`: Cotações, Processamentos, Cancelamentos.
- `FINANCE_STATUS`: Aberturas, Faturado e Atrasos (Overdue).
- `SUPPORT_STATUS`: Incidentes reportados e fechados.

*Para visualização técnica sobre o parse dos agentes (MelhorEnvio, ETC), refira ao documento `status-mapping.md`.*

## 4. Regras de Segurança e Enforcers
Nenhuma rota de dados acessível é exposta à manipulação client-side da modelagem B2B. Modificadores arquiteturais:
- **Tenant Derivation Hard**: Todos os tenantIds viajam implícitos via Payload Context ou Cookie `x-tenant-id` da proxy. Nunca chegam da form data.
- **Access Guard RBAC**: Acesso as Organizações requer transpassar pela verificação assíncrona mandatória presente em `src/infra/security/customer-guards.ts` `(requireOrganizationAccess(session, orgId))`.
- **Data Anonymization API**: Modificadores LGPD purges interceptam `metadataJson` substituindo senhas/dados fiscais na view de logs assíncrona através de deep objects `[REDACTED]`.

## 5. Fundação VS Premium
Esta modelagem representa o cenário Base (Fundação). O modo Premium desbloqueia camadas avançadas, as quais operam fora do schema atual e utilizam domínios externos:
- Alertas de Carga (Cockpit Push).
- Multi-Faturamento com split inteligente.
- Assinatura Inteligente com API Biometria Integrada.
