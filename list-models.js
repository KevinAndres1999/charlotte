// Script para verificar modelos disponibles en Google Gemini API
async function listGeminiModels() {
    // Esta es una API key de ejemplo - reemplaza con la tuya
    const API_KEY = 'AIzaSyDUMMY_KEY_FOR_TESTING'; // Reemplaza con tu key real

    console.log('Verificando modelos disponibles en Google Gemini API...');

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Status:', response.status);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Modelos disponibles:');
            data.models.forEach(model => {
                console.log(`- ${model.name}: ${model.description}`);
                console.log(`  Métodos soportados: ${model.supportedGenerationMethods?.join(', ')}`);
                console.log('');
            });
        } else {
            const errorText = await response.text();
            console.log('❌ Error:', response.status, errorText);
        }
    } catch (error) {
        console.error('Error de conexión:', error);
    }
}

// Ejecutar la verificación
listGeminiModels();

console.log('\nPara usar este script:');
console.log('1. Obtén tu API key gratuita en: https://makersuite.google.com/app/apikey');
console.log('2. Reemplaza API_KEY con tu key real');
console.log('3. Ejecuta: node list-models.js');