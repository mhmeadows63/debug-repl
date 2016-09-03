var debug = require('debug');
var chain = require('scope-chain');
var extend = require('util')._extend;
var fs = require('fs');
var os = require('os');
var path = require('path');

function shutdown(done) {
    if (shutdown._keys) return; // ignore repeated calls
    
    chain(done, function () {
        this(null, shutdown._keys = Object.keys(shutdown).sort());

    }, function callee(keys) {
        if (!keys.length) return this();
        var key = keys.shift();
        debug(shutdown[key].name);
        shutdown[key](callee.bind(this.ignore, keys));

    }, function () {
        pidFd ? fs.close(pidFd, this.ignore) : this();

    }, function () {
        pidFile ? fs.unlink(pidFile, this.ignore) : this();

    }, function () {
        debug('all-done', process.pid);
        this();
    });
}

function debugRepl(module, name, norepl) {
    if (typeof name !== 'string') {
        norepl = name;
        name = path.basename(module.filename, '.js');
    }
    norepl = norepl || !process.stdin.isTTY || !process.stdout.isTTY || module.parent;
    if (!norepl) {
        debugRepl.repl = require('repl')
            .start({ useGlobal: true, ignoreUndefined: true })
            .on('exit', shutdown);
        process.nextTick(function () {
            Object.keys(module.exports).forEach(function (key, i, a) { global[key] = module.exports[key] });
        });
    }
    !norepl && process.nextTick(function () {
        Object.keys(module.exports).forEach(function (key, i, a) { global[key] = module.exports[key] });
    });
    return extend(debug(name), { shutdown: shutdown });
}

module.exports = debugRepl;

process.on('SIGHUP', console.error.bind(console, 'reload')); // systemctl reload <service>
process.once('SIGTERM', shutdown); // systemctl stop <service>
process.once('SIGINT', shutdown); // console-app CTRL-C

var pidFile, pidFd;
process.nextTick(function () {
    if (debugRepl.repl) return;
    
    pidFile = '/run/' + path.basename(process.mainModule.filename, '.js') + '.pid'
    chain(null, function () {
        fs.open(pidFile, 'w', parseInt(644, 8), this);
    }, function (fd) {
        fs.write(pidFd = fd, process.pid + os.EOL, this);
    }, function (written, string) {
        this();
    });
});