const token = process.env.MELHOR_ENVIO_TOKEN || 'jIf2dSpRgLYkx7XTSTBuK1FF3hZSUMbpsaOWbcbf';
fetch('https://sandbox.melhorenvio.com.br/api/v2/me', {
    method: 'GET',
    headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
    }
}).then(res => res.text()).then(console.log).catch(console.error);
