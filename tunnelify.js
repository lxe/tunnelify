'use strict';

var debug = require('debug')('tunnelify');
var assert = require('assert');
var spawn = require('child_process').spawn;
var tmpName = require('tmp').tmpNameSync;

module.exports = Tunnel;

function Tunnel (opts, cb) {
  if (!(this instanceof Tunnel)) {
    return new Tunnel(opts, cb);
  }

  opts = opts || {};
  assert(opts.host, 'opts.host is required');

  opts.verbose = opts.verbose || false;
  opts.quiet = opts.verbose ? false : (opts.quiet || true);
  assert(!(opts.verbose == true && opts.quiet === true),
    'cannot be both verbose and quiet');

  this.opts = opts;
  this.tunnels = this.createTunnels();
  this.isOpen = false;
  this.starting = false;
  this.controlSocket = tmpName();

  if (cb) {
    var self = this;
    setImmediate(function () {
      if (!self.starting && !self.isOpen) {
        return self.open(cb);
      }
    });
  }
}

Tunnel.prototype.createTunnels = function(cb) {
  var opts = this.opts;

  if (opts.port) {
    return [opts.port + ':localhost:' + opts.port];
  } else {
    return Array.isArray(opts.ports) ?
      opts.ports.map(function (p) {
        return p + ':localhost:' + p
      }) :
      Object.keys(opts.tunnels).map(function (p) {
        return p + ':' + opts.tunnels[p]
      });
  }
};

Tunnel.prototype.open = function(cb) {
  if (this.isOpen) return onOpen(0);

  this.starting = true;

  var opts = this.opts;
  var tunnels = this.tunnels;

  var args = tunnels.reduce(function (a, t) {
    a.push('-L');
    a.push(t);
    return a;
  }, [
    // We can't just return an instance of the ssh child process,
    // since we don't know when the tunnel is available and is connected unless
    // we parse the verbose stdout from the command and guess when it's ready.
    // Instead, establish a control socket and spawn a background process.
    '-f',
    '-N',
    '-o', 'ExitOnForwardFailure=yes',
    '-M', '-S', this.controlSocket
  ]);

  args.push(opts.host);

  if (opts.verbose === true) {
    args.push('-v');
  }

  debug('ssh ' + args.join(' '));

  var sshProc = this.spawnSsh(args);

  sshProc.once('error', cb);
  sshProc.once('close', onOpen);

  var self = this;
  function onOpen(code) {
    self.starting = false;

    if (code !== 0) {
      return cb(new Error('Unable to establish tunnel(s). ' +
        'Try running with opts.verbose to see what\'s going on.'));
    }

    self.isOpen = true;
    return cb(null, self);
  }

  return sshProc;
}

Tunnel.prototype.close = function(cb) {
  var opts = this.opts;

  var args = [
    '-S', this.controlSocket,
    '-O', 'exit',
    this.host
  ];

  var sshProc = this.spawnSsh(args);

  sshProc.once('error', function (err) { cb && cb (error) });
  sshProc.once('close', function () { cb && cb (null) });
};

Tunnel.prototype.spawnSsh = function (args) {
  var opts = this.opts;
  return spawn('ssh', args, {
    stdio: opts.verbose === true || opts.quiet !== true ? 'inherit' : 'ignore'
  });
}
