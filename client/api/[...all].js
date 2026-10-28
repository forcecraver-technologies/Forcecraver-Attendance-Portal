import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export default async function handler(req, res) {
  try {
    const app = require('../server/app.js');
    return app(req, res);
  } catch (err) {
    console.error('Serverless Handler Error:', err);
    return res.status(500).json({
      error: 'Serverless Handler Error',
      message: err.message,
      stack: err.stack,
    });
  }
}
