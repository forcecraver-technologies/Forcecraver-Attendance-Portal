module.exports = (req, res) => {
  res.status(200).json({ source: 'client/api/health.js', status: 'ok' });
};
