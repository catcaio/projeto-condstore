import type { ProductResult } from '../../modules/catalog/catalog.types';

export const formatProductQueryResponse = (products: ProductResult[]): string => {
  if (products.length === 0) {
    return 'Desculpe, não encontrei nenhum produto com esse nome. Pode tentar outras palavras?';
  }

  let response = 'Encontrei estes modelos:\n\n';
  
  products.forEach((product, index) => {
    response += `${index + 1}️⃣ ${product.name}\n`;
  });

  response += '\nQual deles você deseja?\nTambém preciso do CEP para calcular o frete.';
  return response;
};

export const formatFreightSimulationResponse = (
  destinationZip: string, 
  carrier: string, 
  deliveryDays: number, 
  price: number
): string => {
  const formattedPrice = price.toFixed(2).replace('.', ',');
  return `Frete para CEP ${destinationZip}:\n\nTransportadora: ${carrier}\nPrazo: ${deliveryDays} dias\nValor: R$ ${formattedPrice}\n\nDeseja seguir com o pedido?`;
};
