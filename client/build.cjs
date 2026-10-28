const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Determine client directory whether run from repo root or inside client
const isRoot = fs.existsSync(path.join(__dirname, 'client'));
const clientDir = isRoot ? path.join(__dirname, 'client') : __dirname;

console.log('📦 Installing client dependencies in:', clientDir);
execSync('npm install', { cwd: clientDir, stdio: 'inherit' });

console.log('⚡ Building Vite frontend in:', clientDir);
execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });

// Ensure root dist/ exists by copying client/dist to ./dist for Vercel/Vite presets
if (isRoot) {
  const rootDist = path.join(__dirname, 'dist');
  const clientDist = path.join(clientDir, 'dist');
  if (fs.existsSync(clientDist)) {
    if (fs.existsSync(rootDist)) {
      fs.rmSync(rootDist, { recursive: true, force: true });
    }
    fs.cpSync(clientDist, rootDist, { recursive: true });
    console.log('📁 Successfully synced client/dist to root dist/');
  }
}

console.log('✅ Frontend build completed successfully!');
