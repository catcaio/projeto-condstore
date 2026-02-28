# Concept Layer

Esta pasta contém uma camada conceitual em experimentação. Hoje ela serve como um experimento controlado e totalmente reversível (concept hero e fractal background), ativado apenas via variáveis de ambiente.

## Como Ativar
Defina a seguinte variável de ambiente:
\`\`\`
NEXT_PUBLIC_ENABLE_CONCEPT_LAYER=true
\`\`\`

## Rota de Preview
Para validação e QA (Quality Assurance) isolados sem tocar na home principal, você pode acessar:
\`/concept-layer-preview\`

## Checklist Manual de QA
Sempre que fizer alterações nesta camada, valide:
- ✅ **Mobile**: O layout quebra ou fica espremido no celular?
- ✅ **Dark Mode**: As cores se comportam corretamente no tema invertido?
- ✅ **CLS (Cumulative Layout Shift)**: Há algum salto na página causado pela inserção tardia dos elementos?
- ✅ **CTA (Call to Action)**: O botão está visível e clicável acima da dobra?
