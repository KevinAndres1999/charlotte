// 📝 EJEMPLO DE USO DEL SDK DE OPENROUTER (para servidor)
// 
// const OpenRouter = require('@openrouter/sdk').OpenRouter;
// 
// async function generarPreguntasConSDK(texto, apiKey) {
//   const client = new OpenRouter({ apiKey: apiKey });
//   
//   const response = await client.callModel({
//     model: 'meta-llama/llama-3.2-3b-instruct',
//     messages: [
//       {
//         role: 'system',
//         content: 'Eres un experto pedagogo que crea preguntas de opción múltiple.'
//       },
//       {
//         role: 'user',
//         content: \Genera 5 preguntas sobre: \\
//       }
//     ]
//   });
//   
//   return response;
// }
//
// 💡 El SDK maneja automáticamente:
// - Autenticación Bearer
// - Headers HTTP-Referer y X-Title
// - Reintentos y timeouts
// - Formato de respuesta estandarizado
