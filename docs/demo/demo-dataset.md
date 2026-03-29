# Demo — Dados oficiais da demonstração

**Uso:** Usar estes dados em todas as demonstrações do MVP. Mantém consistência entre diferentes apresentadores.

---

## Empresa cliente (demo)

| Campo | Valor |
|---|---|
| **Razão Social** | Construdis Materiais LTDA |
| **Nome fantasia** | Construdis |
| **CNPJ** | 12.345.678/0001-99 *(fictício)* |
| **Segmento** | Revenda de materiais de construção |
| **Responsável** | Carlos Andrade |
| **WhatsApp** | +55 11 99887-6655 *(fictício)* |

---

## Histórico fictício do cliente (carregado no demo)

| Data | Pedido | Carrier | Valor | Status |
|---|---|---|---|---|
| 2026-02-14 | 10x Cimento CP-II 50kg | Movvi | R$ 280,00 | DELIVERED |
| 2026-02-28 | 5x Argamassa AC-II 20kg | Braspress | R$ 145,00 | DELIVERED |
| 2026-03-10 | 8x Rejunte Cinza 1kg | Melhor Envio | R$ 62,00 | DELIVERED |

*Total de pedidos do cliente: 3. Histórico 100% entregue.*

---

## Produto do pedido demo

| Campo | Valor |
|---|---|
| **Nome** | Cimento CP-II 50kg |
| **Quantidade** | 12 sacos |
| **Peso unitário** | 50kg |
| **Peso total** | 600kg |
| **Dimensões unitárias** | 60cm × 40cm × 15cm |
| **Valor unitário** | R$ 42,00 |
| **Valor total** | R$ 504,00 |

---

## Endereço de entrega

| Campo | Valor |
|---|---|
| **CEP** | 13480-000 |
| **Cidade** | Limeira — SP |
| **Logradouro** | Rua das Acácias, 210 |
| **Bairro** | Jardim São Paulo |
| **Complemento** | Galpão fundos |

---

## Resultado esperado da cotação

Ao solicitar cotação com esses dados, o sistema deve retornar aproximadamente:

| Carrier | Prazo | Valor frete | Observação |
|---|---|---|---|
| **Movvi** | 3 dias úteis | R$ 148,00 | Tabela própria — melhor custo |
| **Braspress** | 2 dias úteis | R$ 185,00 | Tabela própria — melhor prazo |
| **Melhor Envio** | 4 dias úteis | R$ 132,00 | API real-time — menor valor |

*Valores aproximados — variam conforme tabela vigente. Usar como referência para narrativa, não como promessa.*

---

## Mensagem de abertura (WhatsApp — demo)

Simular esta mensagem chegando durante a demo:

> **Carlos Andrade (Construdis)**
> Boa tarde! Preciso de 12 sacos de cimento CP-II para entregar em Limeira, no CEP 13480-000. Qual o frete?

---

## Resposta do operador após cotação

Após criar pedido, o operador pode enviar no WhatsApp:

> Boa tarde, Carlos! Temos 3 opções de frete:
>
> • **Movvi** — R$ 148,00 — 3 dias úteis
> • **Braspress** — R$ 185,00 — 2 dias úteis
> • **Melhor Envio** — R$ 132,00 — 4 dias úteis
>
> Qual prefere? Confirmando, abro o pedido agora.

---

## Notas para o apresentador

- Esses dados estão pré-carregados no ambiente de demo
- Carlos Andrade já deve aparecer como cliente existente com histórico de 3 pedidos
- A mensagem do WhatsApp deve chegar no início da demo (simular ao vivo)
- Usar sempre o mesmo produto/CEP para manter consistência de valores
- Se o valor de frete variar, adaptar a fala — o importante é mostrar as 3 opções, não os valores exatos
