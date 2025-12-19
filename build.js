const fs = require('fs');
const path = require('path');

// Function to replace environment variables in HTML files
function replaceEnvVarsInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace environment variables
  content = content.replace(/\$\{FIREBASE_API_KEY\}/g, process.env.FIREBASE_API_KEY || 'AIzaSyC5QpmTOMpI36qczNrQmicpMmnQC8PZCe8');
  content = content.replace(/\$\{FIREBASE_AUTH_DOMAIN\}/g, process.env.FIREBASE_AUTH_DOMAIN || 'charlotte-a0d47.firebaseapp.com');
  content = content.replace(/\$\{FIREBASE_PROJECT_ID\}/g, process.env.FIREBASE_PROJECT_ID || 'charlotte-a0d47');
  content = content.replace(/\$\{FIREBASE_STORAGE_BUCKET\}/g, process.env.FIREBASE_STORAGE_BUCKET || 'charlotte-a0d47.firebasestorage.app');
  content = content.replace(/\$\{FIREBASE_MESSAGING_SENDER_ID\}/g, process.env.FIREBASE_MESSAGING_SENDER_ID || '971007838036');
  content = content.replace(/\$\{FIREBASE_APP_ID\}/g, process.env.FIREBASE_APP_ID || '1:971007838036:web:381b5c516ba841fef12ac1');

  fs.writeFileSync(filePath, content);
  console.log(`Processed: ${filePath}`);
}

// Find all HTML files and process them
function processHtmlFiles(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      processHtmlFiles(filePath);
    } else if (file.endsWith('.html')) {
      replaceEnvVarsInFile(filePath);
    }
  });
}

console.log('Starting build process...');
console.log('Environment variables:');
console.log('FIREBASE_API_KEY:', process.env.FIREBASE_API_KEY ? 'Set' : 'Not set');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Not set');

processHtmlFiles('.');
console.log('Build process completed!');