const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Determine client directory whether run from repo root or inside client
const clientDir = fs.existsSync(path.join(__dirname, 'client'))
  ? path.join(__dirname, 'client')
  : __dirname;

console.log('📦 Installing client dependencies in:', clientDir);
execSync('npm install', { cwd: clientDir, stdio: 'inherit' });

console.log('⚡ Building Vite frontend in:', clientDir);
execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });

console.log('✅ Frontend build completed successfully!');
