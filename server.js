const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({
  secure: false,
  changeOrigin: true,
  ignorePath: true
});

const server = http.createServer((req, res) => {
  console.log("Proxy request to:", req.url);
  
  // Proxy para WhatsApp
  if (req.url.includes('/whatsapp')) {
    proxy.web(req, res, { 
      target: 'https://web.whatsapp.com',
    });
  }
});

server.listen(3000, () => {
  console.log('Proxy server running on port 3000');
});