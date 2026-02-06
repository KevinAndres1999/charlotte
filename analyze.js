const fs = require('fs');
try {
  const content = fs.readFileSync('estudiante.html', 'utf8');
  const lines = content.split('\n');

  console.log('🔍 Buscando posibles problemas de sintaxis...');

  let inScript = false;
  let braceCount = 0;
  let parenCount = 0;
  let bracketCount = 0;
  let problems = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Detectar inicio/fin de script
    if (line.includes('<script')) inScript = true;
    if (line.includes('</script>')) inScript = false;

    if (inScript) {
      // Contar llaves, paréntesis y corchetes
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      const openBrackets = (line.match(/\[/g) || []).length;
      const closeBrackets = (line.match(/\]/g) || []).length;

      braceCount += openBraces - closeBraces;
      parenCount += openParens - closeParens;
      bracketCount += openBrackets - closeBrackets;

      // Buscar patrones problemáticos
      if (line.includes('Unexpected token') || line.includes('SyntaxError')) {
        problems.push('Línea ' + lineNum + ': Contiene error de sintaxis');
      }

      // Verificar llaves desbalanceadas en áreas críticas
      if (braceCount < 0 && Math.abs(braceCount) > 2) {
        problems.push('Línea ' + lineNum + ': Posible desbalance de llaves (count: ' + braceCount + ')');
      }

      // Buscar funciones incompletas
      if (line.includes('function') && !line.includes('{') && !lines[i+1]?.includes('{')) {
        problems.push('Línea ' + lineNum + ': Función sin llave de apertura');
      }

      // Buscar strings sin cerrar
      const quotes = line.match(/['\"]/g);
      if (quotes && quotes.length % 2 !== 0) {
        problems.push('Línea ' + lineNum + ': Posible string sin cerrar');
      }
    }
  }

  console.log('Total de líneas analizadas: ' + lines.length);
  console.log('Llaves finales: ' + braceCount);
  console.log('Paréntesis finales: ' + parenCount);
  console.log('Corchetes finales: ' + bracketCount);

  if (problems.length > 0) {
    console.log('\n🚨 PROBLEMAS ENCONTRADOS:');
    problems.forEach(function(problem) { console.log('  - ' + problem); });
  } else {
    console.log('\n✅ No se encontraron problemas obvios de sintaxis');
  }

} catch (error) {
  console.error('Error al analizar archivo:', error.message);
}