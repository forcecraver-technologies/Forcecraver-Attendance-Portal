export default function handler(req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'Forcecraver Portal API is LIVE and healthy!',
    time: new Date().toISOString()
  });
}
