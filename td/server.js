// Tiny static server for the iframe workshop (no dependency).
// Port 3100 = the merchant shop, port 3101 = the payment provider (PSP).
// Two ports = two origins: the card widget is a real cross-origin iframe, like Stripe or Adyen.
const http = require('http');
const fs = require('fs');
const path = require('path');

const SHOP_PORT = 3100;
const PSP_PORT = 3101;
// The merchant's secret key comes from the environment, never from the code.
const SECRET_KEY = process.env.PSP_SECRET_KEY;
if (!SECRET_KEY) {
  console.error('PSP_SECRET_KEY is missing: copy .env.example to .env and fill it in.');
  process.exit(1);
}
const transactions = new Map();   // in-memory record of approved payments

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css' };

function serveStatic(root, req, res) {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const file = path.join(root, urlPath === '/' ? 'index.html' : urlPath);
  if (!file.startsWith(root) || !fs.existsSync(file)) {
    res.writeHead(404); res.end('Not found'); return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'text/plain' });
  fs.createReadStream(file).pipe(res);
}

// Fake payment API: approves, declines or rejects depending on the card number.
function payApi(req, res) {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return; }
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const { cardNumber = '', amount } = JSON.parse(body || '{}');
    const digits = cardNumber.replace(/\s/g, '');
    let status = 200;
    let payload;
    if (digits === '4000000000000002') payload = { status: 'declined', reason: 'insufficient_funds' };
    else {
      payload = { status: 'approved', amount, transactionId: 'TX-' + String(Math.floor(100000 + Math.random() * 900000)) };
      // PCI DSS: the PSP never stores nor returns the full card number, only the last 4 digits.
      transactions.set(payload.transactionId, { id: payload.transactionId, status: 'approved', amount, cardLast4: digits.slice(-4) });
    }
    setTimeout(() => {                      // the bank takes its time: 1.5 s
      res.writeHead(status, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    }, 1500);
  });
}

http.createServer((req, res) => serveStatic(path.join(__dirname, 'site', 'shop'), req, res))
  .listen(SHOP_PORT, () => console.log(`Shop on http://localhost:${SHOP_PORT}`));

// Merchant back-office API: read a payment. Protected by the secret key (Bearer token).
function getPayment(req, res) {
  const json = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
  if (req.headers.authorization !== `Bearer ${SECRET_KEY}`) return json(401, { error: 'unauthorized' });
  const id = req.url.split('/').pop();
  const tx = transactions.get(id);
  return tx ? json(200, tx) : json(404, { error: 'not_found' });
}

http.createServer((req, res) => {
  if (req.url.startsWith('/api/pay')) return payApi(req, res);
  if (req.url.startsWith('/api/v1/payments/') && req.method === 'GET') return getPayment(req, res);
  serveStatic(path.join(__dirname, 'site', 'psp'), req, res);
}).listen(PSP_PORT, () => console.log(`PSP on http://localhost:${PSP_PORT}`));
