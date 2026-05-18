const fs = require('fs');
const path = require('path');

const src = path.join('C:', 'Users', 'pc', '.cursor', 'projects', 'empty-window', 'pace');
const dst = path.join('C:', 'Users', 'pc', 'Desktop', 'running');

if (!fs.existsSync(src)) {
  console.error('Source introuvable:', src);
  console.error('Ouvre ce dossier dans l’Explorateur et copie tout le contenu de "pace" ici manuellement.');
  process.exit(1);
}

fs.mkdirSync(dst, { recursive: true });

if (typeof fs.cpSync === 'function') {
  fs.cpSync(src, dst, { recursive: true, force: true });
} else {
  function copyRecursive(from, to) {
    for (const name of fs.readdirSync(from, { withFileTypes: true })) {
      const f = path.join(from, name.name);
      const t = path.join(to, name.name);
      if (name.isDirectory()) {
        fs.mkdirSync(t, { recursive: true });
        copyRecursive(f, t);
      } else {
        fs.copyFileSync(f, t);
      }
    }
  }
  copyRecursive(src, dst);
}

let n = 0;
function countFiles(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) countFiles(p);
    else n++;
  }
}
countFiles(dst);
console.log('Copié vers:', dst);
console.log('Fichiers:', n);
console.log('Ensuite: cd Desktop\\running && npm run assets && npm install && npm run mobile');
