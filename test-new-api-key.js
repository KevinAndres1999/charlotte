// Script de prueba para verificar la nueva API key de OpenRouter
const API_KEY = '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';

async function testOpenRouterAPI() {
    console.log('Probando nueva API key de OpenRouter...');

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': 'https://cursoscharlotte.com',
                'X-Title': 'Cursos Charlotte'
            },
            body: JSON.stringify({
                model: 'allenai/olmo-3.1-32b-think:free',
                messages: [
                    {
                        role: 'user',
                        content: 'Responde solo con "OK" si puedes leerme.'
                    }
                ],
                max_tokens: 10
            })
        });

        console.log('Status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Respuesta exitosa:', data);
            console.log('Mensaje:', data.choices?.[0]?.message?.content);
        } else {
            const errorText = await response.text();
            console.log('❌ Error:', response.status, errorText);
        }
    } catch (error) {
        console.error('Error de conexión:', error);
    }
}

testOpenRouterAPI();