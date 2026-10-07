const os = require('os');
const app = require('./app');
const { ensureDB } = require('./db');

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

async function start() {
  try {
    if (process.env.DATABASE_URL) {
      await ensureDB();
    } else {
      console.warn('⚠️ [WARNING] DATABASE_URL is not set in .env. Please configure your PostgreSQL connection string.');
    }
  } catch (err) {
    console.error('Database connection failed on startup:', err.message);
  }

  app.listen(PORT, HOST, () => {
    const localIp = getLocalNetworkIp();
    console.log(`=================================================`);
    console.log(`🚀 Forcecraver Attendance Portal Server running on network:`);
    console.log(`   ➜ Local:   http://localhost:${PORT}`);
    console.log(`   ➜ Network: http://${localIp}:${PORT}`);
    console.log(`🔑 Developer: developer@portal.com / dev123`);
    console.log(`👁️ Admin:     admin@portal.com / admin123`);
    console.log(`👤 Employee:  rahul@portal.com / user123`);
    console.log(`=================================================`);
  });
}

start();
