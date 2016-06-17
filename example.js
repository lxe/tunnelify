// Assuming `remote-server` is reachable via ssh
const tunnel = new Tunnel({
  host: 'remote-server',
  port: 3000
});

tunnel.open(err => {
  if (err) throw err;

  const req = require('http').request('http://localhost:3000');

  req.on('response', res => {
    res.on('data', data => process.stdout.write(data));
    res.on('end', () => tunnel.close());
  });

  req.once('error', () => tunnel.close());

  req.end();
});

