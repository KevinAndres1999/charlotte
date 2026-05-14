/**
 * Función Serverless: AI Proxy para OpenRouter
 * 
 * Propósito: Hacer proxy seguro a OpenRouter sin exponer la API key
 * La API key se guarda en variables de entorno de Netlify (privadas)
 * 
 * Uso:
 * POST /api/ai-proxy
 * Body: {
 *   prompt: string,
 *   model?: string (default: google/gemini-2.0-flash-001),
 *   maxTokens?: number (default: 600),
 *   temperature?: number (default: 0.7)
 * }
 */

exports.handler = async (event) => {
  // Solo permitir POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Obtener API key desde variables de entorno o del body del request
    let apiKey = process.env.OPENROUTER_API_KEY;
    
    console.log('🔑 Verificando API key...');
    
    // Parsear request
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      console.error('❌ Error parseando JSON:', e);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'JSON inválido' })
      };
    }

    // Si viene API key en el body, usarla (prioridad alta)
    if (body.apiKey) {
      apiKey = body.apiKey;
      console.log('✅ Usando API key del request (desde Firebase/localStorage)');
    } else if (apiKey) {
      console.log('✅ Usando API key de variables de entorno de Netlify');
    }
    
    if (!apiKey) {
      console.error('❌ API key no existe ni en el request ni en variables de entorno');
      return {
        statusCode: 503,
        body: JSON.stringify({ 
          error: 'IA no disponible',
          message: 'No se encontró API key. Por favor, configúrala en el panel de administración (Proyectos → Configurar IA)'
        })
      };
    }

    if (apiKey.startsWith('sk-or-v1-fake') || apiKey === 'sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
      console.error('❌ API key está configurada con valor por defecto/fake');
      return {
        statusCode: 503,
        body: JSON.stringify({ 
          error: 'IA no disponible',
          message: 'API key no está configurada correctamente. Por favor, configúrala en el panel de administración.'
        })
      };
    }

    console.log('✅ API key presente:', apiKey.substring(0, 15) + '...');

    const { prompt, model = 'google/gemini-2.0-flash-001', maxTokens = 600, temperature = 0.7, systemPrompt } = body;

    if (!prompt) {
      console.error('❌ Prompt vacío');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Prompt es requerido' })
      };
    }

    console.log('📡 Llamando a OpenRouter...');
    console.log('   Model:', model);
    console.log('   Max tokens:', maxTokens);
    console.log('   Prompt length:', prompt.length);
    console.log('   System prompt:', systemPrompt ? 'Sí' : 'No');

    // Construir mensajes - agregar mensaje del sistema si se proporciona
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    // Llamar a OpenRouter con reintentos automáticos para error 429
    let response;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
      try {
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'Charlotte Educational Platform'
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            max_tokens: parseInt(maxTokens),
            temperature: parseFloat(temperature)
          })
        });

        console.log('📍 OpenRouter respondió con status:', response.status);

        // Si es exitosa, salir del bucle
        if (response.ok) {
          break;
        }

        // Si es error 429 y hay reintentos disponibles
        if (response.status === 429 && retryCount < maxRetries) {
          retryCount++;
          const waitTime = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
          console.log(`⏳ Error 429. Reintento ${retryCount}/${maxRetries} en ${waitTime/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        // Si no es 429 o se agotaron los reintentos, procesar error
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error de OpenRouter:');
        console.error('   Status:', response.status);
        console.error('   Error:', JSON.stringify(errorData));
        
        return {
          statusCode: response.status,
          body: JSON.stringify({ 
            error: 'Error en la IA',
            status: response.status,
            details: errorData.error?.message || JSON.stringify(errorData)
          })
        };

      } catch (fetchError) {
        // Error de red o timeout
        if (retryCount < maxRetries) {
          retryCount++;
          const waitTime = Math.pow(2, retryCount) * 1000;
          console.log(`⚠️ Error de red. Reintentando ${retryCount}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw fetchError;
      }
    }

    // Verificar respuesta final
    if (!response || !response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error de OpenRouter después de reintentos:');
      console.error('   Status:', response?.status);
      console.error('   Error:', JSON.stringify(errorData));
      
      return {
        statusCode: response?.status || 500,
        body: JSON.stringify({ 
          error: 'Error en la IA',
          status: response?.status,
          details: errorData.error?.message || 'Error desconocido'
        })
      };
    }

    const data = await response.json();
    console.log('✅ OpenRouter respondió con éxito');
    
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      console.error('❌ Respuesta vacía de OpenRouter');
      console.error('   Response data:', JSON.stringify(data).substring(0, 200));
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'La IA no generó una respuesta' })
      };
    }

    console.log('✅ Respuesta generada, longitud:', aiResponse.length);

    // Retornar respuesta al cliente
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        response: aiResponse,
        model: model
      })
    };

  } catch (error) {
    console.error('❌ Error en ai-proxy:', error.message);
    console.error('   Stack:', error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error en el servidor',
        message: error.message
      })
    };
  }
};
