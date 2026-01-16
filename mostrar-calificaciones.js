const fs = require('fs');

try {
  const calificaciones = JSON.parse(fs.readFileSync('calificaciones_export.json', 'utf8'));

  console.log('📊 CALIFICACIONES EXPORTADAS - RESUMEN COMPLETO\n');
  console.log('=' .repeat(60));

  // Agrupar por estudiante
  const porEstudiante = {};
  calificaciones.forEach(calif => {
    if (!porEstudiante[calif.estudianteId]) {
      porEstudiante[calif.estudianteId] = {};
    }
    porEstudiante[calif.estudianteId][calif.modulo] = {
      actividades: calif.actividades,
      evaluaciones: calif.evaluaciones,
      practica: calif.practica,
      fecha: calif.fechaActualizacion
    };
  });

  // Mostrar por estudiante
  Object.keys(porEstudiante).sort().forEach(estudianteId => {
    console.log(`👤 ${estudianteId}`);
    ['modulo1', 'modulo2', 'modulo3', 'modulo4'].forEach(modulo => {
      if (porEstudiante[estudianteId][modulo]) {
        const data = porEstudiante[estudianteId][modulo];
        console.log(`  📚 ${modulo}: Act=${data.actividades}, Eval=${data.evaluaciones}, Pract=${data.practica}`);
      }
    });
    console.log('');
  });

  console.log(`\n📋 TOTAL: ${calificaciones.length} calificaciones de ${Object.keys(porEstudiante).length} estudiantes`);
  console.log('💾 Archivo: calificaciones_export.json');

} catch (error) {
  console.error('Error:', error);
}