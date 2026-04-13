module.exports = {
  QB_CLIENT_ID: process.env.QB_CLIENT_ID,
  QB_CLIENT_SECRET: process.env.QB_CLIENT_SECRET,
  QB_REDIRECT_URI: process.env.QB_REDIRECT_URI,
  QB_ENV: process.env.QB_ENV || 'production',
  SESSION_SECRET: process.env.SESSION_SECRET,
};
