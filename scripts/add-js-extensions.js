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

      // Replace require statements
      content = content.replace(/(require\(['"])(\.\/.*?)(['"]\))/g, (match, p1, p2, p3) => {
        return p2.endsWith('.js') ? match : `${p1}${p2}.js${p3}`;
      });

      // Replace ES module import statements
      content = content.replace(/(from ['"])(\.\/.*?)(['"])/g, (match, p1, p2, p3) => {
        return p2.endsWith('.js') ? match : `${p1}${p2}.js${p3}`;
      });

      // Replace dynamic imports
      content = content.replace(/(import\(['"])(\.\/.*?)(['"]\))/g, (match, p1, p2, p3) => {
        return p2.endsWith('.js') ? match : `${p1}${p2}.js${p3}`;
      });

      fs.writeFileSync(fullPath, content, 'utf8');
    }
  });
}

addJsExtensions(distDir);