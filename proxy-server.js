const http = require('http');
const https = require('https');

http.createServer((clientReq, clientRes) => {
  const target = clientReq.url.includes('whatsapp') ? 
    'https://web.whatsapp.com' : 
    'https://discord.com';

  const options = {
    hostname: new URL(target).hostname,
    path: clientReq.url,
    method: clientReq.method,
    headers: clientReq.headers
  };

  const proxy = https.request(options, (targetRes) => {
    clientRes.writeHead(targetRes.statusCode, targetRes.headers);
    targetRes.pipe(clientRes, { end: true });
  });

  clientReq.pipe(proxy, { end: true });
}).listen(3000, () => {
  console.log('Proxy running on http://localhost:3000');
});