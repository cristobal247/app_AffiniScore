const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\belen\\.gemini\\antigravity-ide\\brain\\4b72f024-1e99-43a3-8fc5-4ad01dcc7c6f';
const destDir = 'c:\\Proyectos\\AffiniScore-Project\\producto\\app_AffiniScore\\frontend\\src\\assets\\images\\retos';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir);
files.forEach(file => {
  if (file.endsWith('.png')) {
    const cleanName = file.replace(/_\d+\.png$/, '.png');
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, cleanName);
    
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copiado: ${file} -> ${cleanName}`);
  }
});
