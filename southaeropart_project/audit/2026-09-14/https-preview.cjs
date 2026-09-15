const https = require('node:https');
const http = require('node:http');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const options = { key: readFileSync(resolve(__dirname, 'preview-tls/key.pem')), cert: readFileSync(resolve(__dirname, 'preview-tls/cert.pem')) };
for (const [port, upstream] of [[3443,3100],[3444,3101]]) {
 https.createServer(options, (req,res) => {
  const headers = { ...req.headers, host: `localhost:${port}`, 'x-forwarded-host': `localhost:${port}`, 'x-forwarded-proto': 'https' };
  const proxy = http.request({ hostname: '127.0.0.1', port: upstream, path: req.url, method: req.method, headers }, response => {
   res.writeHead(response.statusCode, response.headers); response.pipe(res);
  });
  proxy.on('error', () => { res.writeHead(502); res.end(); });
  req.pipe(proxy);
 }).listen(port, '127.0.0.1', () => console.log(`Local HTTPS preview ready: ${port}`));
}
