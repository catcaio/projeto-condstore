# Manual Validation scenarios for WhatsApp (Today's Tests)

This document contains the validation checklist to confirm that the inbound/outbound WhatsApp message flow works together with Frank (Supervised) and Freight simulations.

## Objectives
- Confirm that WhatsApp messages successfully reach the Cockpit `Caixa de Entrada`.
- Confirm that `supervisedAssistService.generatePassiveSuggestion` properly suggests responses for known intents (`FRETE`, `PRODUTO`) using our seeded Playbooks.
- Confirm that Operators can edit the suggestion, quote freights manually within the Inbox, and send correct messages to Twilio without errors or PII leaks.

## Rules
- Frank must **NOT** respond automatically under any circumstance.
- The timeline must correctly record `MESSAGE_RECEIVED`, `MESSAGE_SENT`, `SUGGESTION_GENERATED`, and `QUOTE_SIMULATED`.

---

## Testing Scenarios

### Scenario 1: Product Price
**Action**: Client sends "Qual o preço da lixeira 240L?" via WhatsApp.
- [ ] Arrived in `/cockpit/atendimento`?
- [ ] Intent detected as `PRODUTO`?
- [ ] Frank suggested base response using the Seeded Base Knowledge table?
- [ ] Operator sent the response successfully?

### Scenario 2: Product Availability
**Action**: Client sends "Vocês tem carrinhos de compra disponíveis?" via WhatsApp.
- [ ] Arrived in `/cockpit/atendimento`?
- [ ] Intent detected as `PRODUTO`?
- [ ] Playbook triggered properly mentioning models and capacities?
- [ ] Operator sent response successfully?

### Scenario 3: Freight with CEP
**Action**: Client sends "Gostaria de saber o valor do frete para o CEP 04538-132."
- [ ] Arrived in `/cockpit/atendimento`?
- [ ] Intent detected as `FRETE`?
- [ ] Frank playbook asked for Missing Information (quantity/volume)?
- [ ] Operator opened the `FreightQuotePanel` inside the right pane?
- [ ] Simulation returned effectively?
- [ ] Operator sent the resulting quote via WhatsApp?

### Scenario 4: Delivery Deadline
**Action**: Client sends "E qual o prazo de entrega desse pedido?"
- [ ] Arrived in `/cockpit/atendimento`?
- [ ] Intent safely resolved contextually?
- [ ] Sent to timeline?

### Scenario 5: Incomplete Query
**Action**: Client sends "valor?"
- [ ] Arrived in `/cockpit/atendimento`?
- [ ] Intent mapped to fallback or product?
- [ ] Frank failed safely (Outcome: fallback)?

### Scenario 6: Short contextual follow-up
**Action**: After receiving Quote, client sends "ok e pra 2?"
- [ ] Arrived in `/cockpit/atendimento`?
- [ ] Contextual intent resolver mapped it to `FRETE` or fallback appropriately?
- [ ] Operator was able to execute a new simulation for qty=2?

---

*Note: Document all bugs found below this line.*
