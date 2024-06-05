const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();


app.use('/api', createProxyMiddleware({
  target: 'https://api-adresse.data.gouv.fr',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '',
  },
}));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Proxy server is running on http://localhost:${PORT}`);
});