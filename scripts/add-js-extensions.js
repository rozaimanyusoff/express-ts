const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');

function addJsExtensions(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      addJsExtensions(fullPath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace(/(require\(['"])(\.\/.*?)(['"]\))/g, '$1$2.js$3');
      content = content.replace(/(from ['"])(\.\/.*?)(['"])/g, '$1$2.js$3');
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  });
}

addJsExtensions(distDir);