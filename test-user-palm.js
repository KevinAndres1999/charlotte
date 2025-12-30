// Script de prueba con la API key real del usuario usando PaLM
const API_KEY = 'AIzaSyDJRVwjxgRu11CI09HM3lTkULH6AweTQAc';

async function testUserPaLMAPI() {
    console.log('Probando API key del usuario con Google PaLM...');

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-bison-001:generateText?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: {
                    text: 'Responde solo con "OK" si puedes leerme.'
                },
                temperature: 0.7,
                candidateCount: 1,
                maxOutputTokens: 50
            })
        });

        console.log('Status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Respuesta exitosa:', data);
            console.log('Mensaje:', data.candidates?.[0]?.output);
        } else {
            const errorText = await response.text();
            console.log('❌ Error:', response.status, errorText);
        }
    } catch (error) {
        console.error('Error de conexión:', error);
    }
}

testUserPaLMAPI();