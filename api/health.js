module.exports = (req, res) => {
  res.status(200).json({ source: 'root/api/health.js', status: 'ok' });
};
