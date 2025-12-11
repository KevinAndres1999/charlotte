const fs = require('fs');
const path = require('path');

// Inserta data-include para header/footer y carga load-components.js al final del body
const folder = process.cwd();
const files = fs.readdirSync(folder).filter(f => f.endsWith('.html'));
files.forEach(file => {
  const full = path.join(folder, file);
  let txt = fs.readFileSync(full, 'utf8');
  if(txt.includes('data-include="header"') || txt.includes('data-include="components/header.html"')){
    console.log(file, 'ya contiene include, saltando');
    return;
  }
  // insertar header justo después de <body>
  txt = txt.replace(/(<body[^>]*>)/i, `$1\n<div data-include="header"></div>`);
  // insertar footer antes de </body>
  if(!txt.includes('data-include="footer"')){
    txt = txt.replace(/(<\/body>)/i, `\n<div data-include="footer"></div>\n<script src="load-components.js" defer></script>\n$1`);
  }
  fs.writeFileSync(full, txt, 'utf8');
  console.log('Actualizado', file);
});
