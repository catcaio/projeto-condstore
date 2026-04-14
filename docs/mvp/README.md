# MVP CONDSTORE OS — Documentação oficial

Este diretório contém a definição oficial e consolidada do MVP CONDSTORE OS no Lote 1.

**Última atualização:** 2026-03-29
**Status:** Em produção

---

## Índice

### [1. mvp-definition.md](./mvp-definition.md)
**O que é o CONDSTORE OS?**

- Definição em 1 frase
- Definição em 1 parágrafo
- O que faz e o que NÃO faz
- ICP (Ideal Customer Profile)
- Proposta de valor
- Por que supervisão humana é vantagem

**Leia primeiro isto** se você quer entender o produto em 5 minutos.

---

### [2. architecture-map.md](./architecture-map.md)
**Como o MVP funciona internamente?**

- Fluxo ponta a ponta: Lead → WhatsApp → Cotação → Pedido → Entrega
- Etapas detalhadas de cada módulo
- Responsabilidades simplificadas
- Dependências externas críticas
- Características arquiteturais

**Leia isto** se você quer entender a estrutura funcional sem detalhar código.

---

### [3. cockpit-map.md](./cockpit-map.md)
**O que o operador/gestor vê?**

- Mapa de cada sala (Inbox, Pedidos, CRM, Logística, Clientes, Configurações)
- O que cada papel vê e faz
- APIs associadas a cada funcionalidade
- Fluxo típico do operador durante um dia
- Garantias do cockpit operacional

**Leia isto** se você quer entender a experiência do usuário.

---

### [4. boundaries.md](./boundaries.md)
**O que está fora do MVP?**

- ERP e integrações sistêmicas
- Automação completa sem supervisão
- Frank runtime / IA autônoma
- Marketplace e múltiplos canais
- Gestão de estoque
- Nota Fiscal
- Catálogo completo
- Campanhas de marketing

Inclui **linguagem para quando cliente pede algo fora do escopo** e **checklist para identificar escopo-creep**.

**Leia isto** para saber o que dizer "não" com confiança.

---

### [5. dependencies.md](./dependencies.md)
**Do que o MVP depende para funcionar?**

- Twilio (WhatsApp)
- Banco de dados (MySQL)
- Melhor Envio API (frete)
- Redis (cache + fila)
- Carrier tables (fallback)
- Observabilidade (Sentry)
- SMTP (email)

Para cada dependência: como funciona, o que acontece se cair, como recuperar, o que monitorar.

**Leia isto** se você precisa entender resiliência e o que pode quebrar o sistema.

---

## Princípios fundamentais do MVP

1. **Operador humano sempre no centro** — sem automação invisível
2. **Supervisionado por design** — toda ação crítica requer aprovação
3. **Velocidade operacional** — reduz cotação de 15 min para <30 segundos
4. **Visibilidade total** — gestor vê tudo que está aberto
5. **Sem expansão de escopo** — foco obsessivo em WhatsApp → cotação → pedido → logística

---

## Para diferentes públicos

### Executivo / Comercial
Leia: `mvp-definition.md` → pergunte "vale a pena?" e "para quem é?"

### Gerente de produto
Leia: `mvp-definition.md` → `cockpit-map.md` → `boundaries.md`

### Engenheiro
Leia: `architecture-map.md` → `dependencies.md`

### Operador/Gestor do cliente
Leia: `cockpit-map.md` — é a sua realidade

### Suporte/Onboarding
Leia: `cockpit-map.md` → `boundaries.md` — saiba o que prometer e o que não prometer

---

## Validação da consistência

Todos os arquivos estão em sync se:
- [ ] Nenhum documento menciona Frank runtime como feature do MVP
- [ ] Nenhum documento promete automação sem supervisão
- [ ] Cada documento reflete "operador no centro"
- [ ] Boundaries lista explicitamente o que NÃO é MVP
- [ ] Architecture-map é consistente com cockpit-map
- [ ] Nenhum campo ou fluxo novo foi inventado

---

## Se encontrar inconsistência

1. Identifique qual arquivo está errado
2. Verifique contra o código real (`src/modules/*`, `src/app/(cockpit)/*`)
3. Atualize o arquivo para refletir a realidade
4. Marque a data da atualização

Este diretório é **fonte única de verdade** sobre o MVP. Se a realidade mudou, os docs mudam.

---

## Perguntas frequentes

**P: Frank está no MVP?**
R: Infraestrutura sim, runtime não. Veja `boundaries.md`.

**P: Qual é a diferença entre este doc e `docs/product/gtm-mvp.md`?**
R: GTM é estratégia comercial + pitch. Este diretório é definição técnica do MVP.

**P: Onde está o roadmap?**
R: Não existe. MVP é Lote 1. Roadmap é decisão comercial, fora desta documentação.

**P: Posso adicionar uma feature nova?**
R: Primeiro verifique `boundaries.md`. Se não está lá como bloqueio explícito, discuta com PM antes.

---

## Histórico de atualizações

| Data | Autor | Mudança |
|---|---|---|
| 2026-03-29 | arquitetura | Consolidação inicial do MVP |
| 2026-03-31 | sincronização | Alinhamento de estados do pedido e fluxo supervisionado ao código real (PR 218) |

