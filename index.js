const path = require('path');
const fs = require('fs');

const spdy = require('spdy');
const httpProxy = require('http-proxy');

const BITCOIND_PORT_FRONT = 18333;
const BITCOIND_PORT_BACK = 18332;
const COUNTERPARTYLIB_PORT_FRONT = 14001;
const COUNTERPARTYLIB_PORT_BACK = 14000;

const _requestCerts = () => new Promise((accept, reject) => {
  if (process.argv.length === 3) {
    const certPath = process.argv[2];

    const _readFile = (p, opts) => new Promise((accept, reject) => {
      fs.readFile(p, opts, (err, d) => {
        if (!err) {
          accept(d);
        } else {
          reject(err);
        }
      });
    });

    Promise.all([
      _readFile(path.join(certPath, 'cert.pem'), 'utf8'),
      _readFile(path.join(certPath, 'private.pem'), 'utf8'),
    ])
      .then(([
        cert,
        privateKey,
      ]) => ({
        cert,
        privateKey,
      }))
      .then(accept)
      .catch(reject);
  } else {
    const err = new Error('expected 1 argument');
    reject(err);
  }
});
const _initBitcoindServer = certs => new Promise((accept, reject) => {
  const server = spdy.createServer({
    cert: certs.cert,
    key: certs.privateKey,
  }, (req, res) => {
    proxy.web(req, res, err => {
      if (err) {
        res.statusCode = 500;
        res.end(err.stack);
      }
    });
  });

  const proxy = httpProxy.createProxyServer({
    target: `http://localhost:${BITCOIND_PORT_BACK}`,
  });
  server.listen(BITCOIND_PORT_FRONT, err => {
    if (!err) {
      accept();
    } else {
      reject(err);
    }
  });
});
const _initCounterpartyLibServer = certs => new Promise((accept, reject) => {
  const server = spdy.createServer({
    cert: certs.cert,
    key: certs.privateKey,
  }, (req, res) => {
    proxy.web(req, res, err => {
      if (err) {
        res.statusCode = 500;
        res.end(err.stack);
      }
    });
  });

  const proxy = httpProxy.createProxyServer({
    target: `http://localhost:${COUNTERPARTYLIB_PORT_BACK}`,
  });
  server.listen(COUNTERPARTYLIB_PORT_FRONT, err => {
    if (!err) {
      accept();
    } else {
      reject(err);
    }
  });
});

_requestCerts()
  .then(certs => Promise.all([
    _initBitcoindServer(certs),
    _initCounterpartyLibServer(certs),
  ]))
  .then(() => {
    console.log('listening');
  })
  .catch(err => {
    console.warn(err);
  });
