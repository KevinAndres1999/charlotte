const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class VideoCompressor {
  constructor() {
    this.videos = [
      {
        input: 'video inicio.mp4',
        output: 'video inicio-compressed.mp4',
        targetWidth: 1280,
        quality: 28
      },
      {
        input: 'video belleza.mp4', 
        output: 'video belleza-compressed.mp4',
        targetWidth: 1280,
        quality: 28
      },
      {
        input: 'video panaderia.mp4',
        output: 'video panaderia-compressed.mp4', 
        targetWidth: 1280,
        quality: 28
      }
    ];
  }

  async checkFFmpeg() {
    try {
      await execAsync('ffmpeg -version');
      console.log('✅ FFmpeg encontrado');
      return true;
    } catch (error) {
      console.log('❌ FFmpeg no encontrado. Instálalo primero:');
      console.log('   winget install ffmpeg');
      console.log('   O descarga desde: https://ffmpeg.org/download.html');
      return false;
    }
  }

  async getVideoInfo(filePath) {
    try {
      const { stdout } = await execAsync(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`);
      const info = JSON.parse(stdout);
      
      const videoStream = info.streams.find(s => s.codec_type === 'video');
      const audioStream = info.streams.find(s => s.codec_type === 'audio');
      
      return {
        duration: parseFloat(info.format.duration),
        size: parseInt(info.format.size),
        width: videoStream?.width,
        height: videoStream?.height,
        bitrate: parseInt(info.format.bit_rate),
        fps: eval(videoStream?.r_frame_rate || '0/1'),
        hasAudio: !!audioStream
      };
    } catch (error) {
      console.error(`❌ Error obteniendo info de ${filePath}:`, error.message);
      return null;
    }
  }

  async compressVideo(videoConfig) {
    const { input, output, targetWidth, quality } = videoConfig;
    
    console.log(`\n🎬 Procesando: ${input}`);
    
    // Verificar archivo de entrada
    if (!fs.existsSync(input)) {
      console.log(`❌ Archivo no encontrado: ${input}`);
      return null;
    }

    // Obtener información original
    const originalInfo = await this.getVideoInfo(input);
    if (!originalInfo) return null;

    console.log(`📊 Original: ${(originalInfo.size / 1024 / 1024).toFixed(2)}MB, ${originalInfo.width}x${originalInfo.height}, ${originalInfo.duration.toFixed(1)}s`);

    // Construir comando FFmpeg
    const ffmpegCommand = [
      'ffmpeg',
      '-i', `"${input}"`,
      '-vcodec', 'libx264',
      '-crf', quality.toString(),
      '-preset', 'medium',
      '-vf', `scale=${targetWidth}:-2`,
      '-acodec', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-y', // Sobrescribir archivo existente
      `"${output}"`
    ].join(' ');

    console.log('⚙️ Comprimiendo... (puede tardar varios minutos)');

    try {
      const startTime = Date.now();
      await execAsync(ffmpegCommand);
      const endTime = Date.now();

      // Verificar resultado
      if (!fs.existsSync(output)) {
        console.log('❌ Error: archivo de salida no creado');
        return null;
      }

      const compressedInfo = await this.getVideoInfo(output);
      const compressionRatio = ((originalInfo.size - compressedInfo.size) / originalInfo.size * 100);
      const timeSaved = ((endTime - startTime) / 1000).toFixed(1);

      console.log(`✅ Compresión completada en ${timeSaved}s`);
      console.log(`📊 Comprimido: ${(compressedInfo.size / 1024 / 1024).toFixed(2)}MB, ${compressedInfo.width}x${compressedInfo.height}`);
      console.log(`📉 Reducción: ${compressionRatio.toFixed(1)}% (${(originalInfo.size / 1024 / 1024 - compressedInfo.size / 1024 / 1024).toFixed(2)}MB ahorrados)`);

      return {
        original: originalInfo,
        compressed: compressedInfo,
        compressionRatio,
        timeSaved
      };

    } catch (error) {
      console.error(`❌ Error comprimiendo ${input}:`, error.message);
      return null;
    }
  }

  async createBackup() {
    console.log('\n💾 Creando backup de videos originales...');
    
    const backupDir = 'videos-backup';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }

    for (const video of this.videos) {
      if (fs.existsSync(video.input)) {
        const backupPath = path.join(backupDir, video.input);
        if (!fs.existsSync(backupPath)) {
          fs.copyFileSync(video.input, backupPath);
          console.log(`✅ Backup creado: ${backupPath}`);
        } else {
          console.log(`ℹ️  Backup ya existe: ${backupPath}`);
        }
      }
    }
  }

  async replaceOriginals() {
    console.log('\n🔄 Reemplazando videos originales...');
    
    for (const video of this.videos) {
      if (fs.existsSync(video.output)) {
        // Hacer backup del original si no existe
        const backupPath = `${video.input}.backup`;
        if (fs.existsSync(video.input) && !fs.existsSync(backupPath)) {
          fs.copyFileSync(video.input, backupPath);
          console.log(`💾 Backup original: ${backupPath}`);
        }

        // Reemplazar
        fs.copyFileSync(video.output, video.input);
        console.log(`✅ Reemplazado: ${video.input}`);
        
        // Eliminar archivo temporal
        fs.unlinkSync(video.output);
        console.log(`🗑️  Eliminado temporal: ${video.output}`);
      }
    }
  }

  async generateReport(results) {
    console.log('\n📊 REPORTE DE COMPRESIÓN');
    console.log('='.repeat(50));
    
    let totalOriginal = 0;
    let totalCompressed = 0;
    
    results.forEach((result, index) => {
      if (result) {
        const video = this.videos[index];
        console.log(`\n🎬 ${video.input}`);
        console.log(`   Original: ${(result.original.size / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   Comprimido: ${(result.compressed.size / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   Reducción: ${result.compressionRatio.toFixed(1)}%`);
        console.log(`   Tiempo: ${result.timeSaved}s`);
        
        totalOriginal += result.original.size;
        totalCompressed += result.compressed.size;
      }
    });
    
    const totalReduction = ((totalOriginal - totalCompressed) / totalOriginal * 100);
    const totalSaved = (totalOriginal - totalCompressed) / 1024 / 1024;
    
    console.log('\n📈 TOTALES');
    console.log(`   Tamaño original: ${(totalOriginal / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Tamaño comprimido: ${(totalCompressed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Reducción total: ${totalReduction.toFixed(1)}%`);
    console.log(`   Espacio ahorrado: ${totalSaved.toFixed(2)}MB`);
    
    // Impacto en rendimiento
    console.log('\n🚀 IMPACTO EN RENDIMIENTO');
    console.log(`   Conexión 3G (3Mbps): ${(totalCompressed / 1024 / 1024 / 3 * 8).toFixed(1)}s vs ${(totalOriginal / 1024 / 1024 / 3 * 8).toFixed(1)}s`);
    console.log(`   Conexión 4G (10Mbps): ${(totalCompressed / 1024 / 1024 / 10 * 8).toFixed(1)}s vs ${(totalOriginal / 1024 / 1024 / 10 * 8).toFixed(1)}s`);
  }

  async run() {
    console.log('🎬 INICIANDO COMPRESIÓN DE VIDEOS');
    console.log('=====================================');

    // Verificar FFmpeg
    const hasFFmpeg = await this.checkFFmpeg();
    if (!hasFFmpeg) return;

    // Crear backup
    await this.createBackup();

    const results = [];
    
    // Comprimir cada video
    for (const videoConfig of this.videos) {
      const result = await this.compressVideo(videoConfig);
      results.push(result);
    }

    // Generar reporte
    await this.generateReport(results);

    // Preguntar si reemplazar originales
    console.log('\n❓ ¿Deseas reemplazar los videos originales?');
    console.log('   Los archivos originales se guardarán como .backup');
    console.log('   Ejecuta: node compress-videos.js --replace para reemplazar');
    
    if (process.argv.includes('--replace')) {
      await this.replaceOriginals();
      console.log('\n✅ Videos originales reemplazados exitosamente');
    }
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const compressor = new VideoCompressor();
  compressor.run().catch(console.error);
}

module.exports = VideoCompressor;
