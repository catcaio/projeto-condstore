
async function checkHealth() {
    try {
        const res = await fetch('http://localhost:3000/api/health');
        console.log('Status:', res.status);
        const body = await res.json();
        console.log('Body:', JSON.stringify(body, null, 2));
    } catch (err) {
        console.error('Fetch failed:', err);
    }
}
checkHealth();
