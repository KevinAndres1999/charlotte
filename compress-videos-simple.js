const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function compressVideos() {
  console.log('🎬 Optimización de Videos - Versión Simple');
  console.log('==========================================');

  // Verificar FFmpeg
  try {
    await execAsync('ffmpeg -version');
    console.log('✅ FFmpeg encontrado');
  } catch (error) {
    console.log('❌ FFmpeg no encontrado. Ejecuta: install-ffmpeg.ps1');
    return;
  }

  const videos = [
    {
      input: 'video inicio.mp4',
      output: 'video inicio-optimized.mp4',
      params: '-crf 30 -preset medium -b:v 800k'
    },
    {
      input: 'video belleza.mp4', 
      output: 'video belleza-optimized.mp4',
      params: '-crf 28 -preset medium -vf scale=1280:-2 -b:v 1000k'
    },
    {
      input: 'video panaderia.mp4',
      output: 'video panaderia-optimized.mp4', 
      params: '-crf 28 -preset medium -b:v 600k'
    }
  ];

  let totalOriginal = 0;
  let totalOptimized = 0;

  for (const video of videos) {
    if (!fs.existsSync(video.input)) {
      console.log(`❌ No encontrado: ${video.input}`);
      continue;
    }

    console.log(`\n🎬 Procesando: ${video.input}`);

    // Obtener tamaño original
    const stats = fs.statSync(video.input);
    const originalSize = stats.size;
    totalOriginal += originalSize;
    
    console.log(`📊 Original: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);

    // Comando FFmpeg
    const command = `ffmpeg -i "${video.input}" -c:v libx264 ${video.params} -c:a aac -b:a 128k -movflags +faststart -y "${video.output}"`;
    
    try {
      console.log('⚙️ Comprimiendo...');
      const startTime = Date.now();
      await execAsync(command);
      const endTime = Date.now();
      
      if (fs.existsSync(video.output)) {
        const optimizedStats = fs.statSync(video.output);
        const optimizedSize = optimizedStats.size;
        totalOptimized += optimizedSize;
        
        const reduction = ((originalSize - optimizedSize) / originalSize * 100);
        const timeTaken = ((endTime - startTime) / 1000).toFixed(1);
        
        console.log(`✅ Completado en ${timeTaken}s`);
        console.log(`📊 Optimizado: ${(optimizedSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`📉 Reducción: ${reduction.toFixed(1)}%`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  // Resumen final
  console.log('\n📊 RESUMEN FINAL');
  console.log('==================');
  console.log(`Tamaño original total: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB`);
  console.log(`Tamaño optimizado total: ${(totalOptimized / 1024 / 1024).toFixed(2)}MB`);
  
  const totalReduction = ((totalOriginal - totalOptimized) / totalOriginal * 100);
  console.log(`Reducción total: ${totalReduction.toFixed(1)}%`);
  
  if (totalReduction > 0) {
    console.log(`Espacio ahorrado: ${((totalOriginal - totalOptimized) / 1024 / 1024).toFixed(2)}MB`);
    console.log('\n✅ Para reemplazar los originales, ejecuta:');
    console.log('   node compress-videos-simple.js --replace');
  } else {
    console.log('\n⚠️ Los videos optimizados son más grandes');
    console.log('💡 Considera mantener los originales');
  }

  // Reemplazar si se especifica
  if (process.argv.includes('--replace')) {
    console.log('\n🔄 Reemplazando videos originales...');
    
    for (const video of videos) {
      if (fs.existsSync(video.output)) {
        // Backup
        const backupPath = `${video.input}.backup`;
        if (fs.existsSync(video.input) && !fs.existsSync(backupPath)) {
          fs.copyFileSync(video.input, backupPath);
          console.log(`💾 Backup: ${backupPath}`);
        }
        
        // Reemplazar
        fs.copyFileSync(video.output, video.input);
        console.log(`✅ Reemplazado: ${video.input}`);
        
        // Limpiar
        fs.unlinkSync(video.output);
        console.log(`🗑️ Eliminado: ${video.output}`);
      }
    }
    console.log('\n✅ Reemplazo completado');
  }
}

if (require.main === module) {
  compressVideos().catch(console.error);
}

module.exports = compressVideos;
