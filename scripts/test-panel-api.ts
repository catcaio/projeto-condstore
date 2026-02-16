
async function testPanelApi() {
    console.log('Testing POST /api/painel-logistico...');
    try {
        const res = await fetch('http://localhost:3000/api/painel-logistico', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true })
        });

        console.log(`Status: ${res.status}`);
        const data = await res.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (res.status === 200 && data.ok) {
            console.log('✅ Panel API Test Passed');
        } else {
            console.error('❌ Panel API Test Failed');
            process.exit(1);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        process.exit(1);
    }
}

testPanelApi();
