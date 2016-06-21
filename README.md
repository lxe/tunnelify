# tunnelify

![](https://img.shields.io/badge/no-bugs-brightgreen.svg)

Spawns whatever `ssh` client/command is available on your system and opens a tunnel to (from?) a remote host and port(s).

## Why?

 - I need to programmatically open and close SSH tunnels.
 - None of the other libraries ([strong-tunnel](https://www.npmjs.com/package/strong-tunnel), [tunnel-ssh](https://github.com/Finanzchef24-GmbH/tunnel-ssh), vanilla [ssh2](https://github.com/mscdex/ssh2)) worked for me for one reason or another and I am too lazy to investigate.
 - Executing `ssh` command in shell worked well so I made this thing that just wraps `ssh`.
 - SSH tunneling is confusing... I just want to make it so I can `curl localhost:port` and it actually curls the remote port.
 - I don't want a bunch of dependencies.
 - I want to actually properly tear it down after I'm done or if something fails.

## How?

Do:

```
$ npm install --save tunnelify@latest
```

And in your code:

```javascript
var Tunnel = require('tunnelify');

// Same as doing this:
// ssh -NL 80:localhost:80 work-machine

const tunnel = Tunnel({
  host: 'work-machine',

  // Make localhost:80 tunnel to work-machine's port 80
  // [local-machine:80] -> [work-machine:80]
  port: 80
}, (err) => {
  if (err) throw err;

  // Now you can make requests to `localhost:9000`
  const req = require('http').request('http://localhost:9000');
  req.on('response', res => {
    res.on('data', chunk => process.stdout.write(chunk));

    // Don't forget to clean up!
    res.on('end', () => tunnel.close());
  });
});
```

Or for more advanced users:

```javascript
var Tunnel = require('tunnelify');

// Same as doing this:
//
// ssh -N \
//   -L 389:ldap.server:389 \
//   -L 9000:localhost:80 \
//   work-machine

const tunnel = Tunnel({
  host: 'work-machine',
  ports: {
    // Make localhost:389 tunnel to an ldap server only accessible from work-machine:
    // [local-machine:389] -> [work-machine] -> [ldap.server:389]
    389: 'ldap.server:389',

    // Make localhost:9000 tunnel to work-machine's port 80
    // [local-machine:9000] -> [work-machine:80]
    9000: 'localhost:80'
  }
}, (err) => {
  if (err) throw err;

  // Now you can make requests to `localhost:389` and `localhost:9000`
  const req = require('http').request('http://localhost:9000');
  req.on('response', res => {
    res.on('data', chunk => process.stdout.write(chunk));

    // Don't forget to clean up!
    res.on('end', () => tunnel.close());
  });
});
```

## Options

Available options and examples of how to use them:

 - `host` remote host to which tunnelify will make an SSH connection.
   - `{host: 'remote-host'}` will open an SSH connection to remote-host (using whatever configuration your `ssh` command line client uses), won't execute a command, and won't tunnel any ports. (Equivalent to `ssh -N remote-host`). You can probably specify the username here as well (`root@remote-host`).

 - `port` [simple] remote and local port numbers which will be tunneled (`ssh -NL {port}:localhost:{port} remote-host`)
   - `{port: 80}` will tunnel local port 80 to remote hosts' port 80. (Equivalent to `ssh -N -D 80 remote-host`)

 - `tunnels` [advanced] an array of ports or a map of local ports to remotely-accessible hosts and ports:
  - `[80, 3000, 443]` will open local ports 80, 3000, and 443, and tunnel them to remote host's ports 80, 3000, and 443 respectively. (Equivalent to `... -L 80:localhost:80 -L 3000:localhost:3000 -L 443:localhost:443 ...`)
  - `{80: 80}` will tunnel local port 80 to remote hosts' port 80. (Equivalent to `... -L 80:localhost:80 ...`)
  - `{80: 'localhost:80'}` Same thing as the previous example. This will tunnel local port 80 to remote hosts' port 80. (Equivalent to `... -L 80:localhost:80 ...`)
  - `{3000: 'localhost:80'}` This will tunnel local port 3000 to remote hosts' port 80. (Equivalent to `... -L 3000:localhost:80 ...`). Useful when you can't listen on local port 80
  - `{3000: 'another-remote-server:1234'}` This will tunnel local port 3000 to port 1234 of a host "another-remote-server" which is only accessible from the "remote-host" (Equivalent to `ssh -NL 3000:another-remote-server:1234 remote-server`).

 - `verbose` [default: false] will make it print stuff to stderr (Equivalent to `ssh -v ...`)
 - `quiet` [default: true] will suppress all output from ssh subprocess

Methods of the `Tunnel` instance:

 - Constructor `Tunnel(opts, (err, tunnel) => {})` sets up the tunnel and starts it if callback is provided
   - callback takes `(err, tunnel)` as arguments, where `tunnel` is the `Tunnel` instance

 - `open((err) => {})` open the tunnel
 - `close((err) => {})` closes the tunnel

You can also [debug](https://github.com/visionmedia/debug) it like this:

```
$ DEBUG=tunnelify node your-code.js
```

## Usage Notes
It creates an SSH control socket and spawns a background process, which are some very undesirable side effects if you're running this in production. This is intended for debugging and development. You probably should use [ssh2](https://github.com/mscdex/ssh2) library for serious business production programs.

## License

See [LICENSE](./LICENSE)


