module.exports = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Forcecraver Attendance Portal Serverless API is alive!',
    database: process.env.DATABASE_URL ? 'PostgreSQL Configured' : 'Missing DATABASE_URL',
    time: new Date().toISOString()
  });
};
