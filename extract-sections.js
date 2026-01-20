const fs = require('fs');
const path = require('path');

const content = fs.readFileSync('admin.html', 'utf8');
const sections = ['entregas-viewer', 'respuestas-viewer', 'cuestionarios', 'cuestionarios-manager', 'evaluaciones', 'evaluacion-practica', 'evaluaciones-manager', 'materiales', 'recursos', 'videoconferencia', 'clase-viewer', 'foros', 'gamificacion'];

sections.forEach(section => {
    const regex = new RegExp(`<div id="${section}" class="content-section"[^>]*>[\\s\\S]*?(?=<div id="[^"]*" class="content-section"|<script|<style|$)`, 'g');
    const match = regex.exec(content);
    if (match) {
        const sectionContent = match[0];
        const filePath = path.join('admin-sections', section + '.html');
        fs.writeFileSync(filePath, sectionContent, 'utf8');
        console.log('Created: ' + filePath);
    } else {
        console.log('No match for: ' + section);
    }
});