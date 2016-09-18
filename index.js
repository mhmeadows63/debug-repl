var chain = require('scope-chain');
var debug = require('debug');
var extend = require('util')._extend;
var fs = require('fs');
var os = require('os');
var path = require('path');

var pidFile, pidFd;

exports.shutdown = function shutdown(done) {
    if (shutdown._keys) return; // ignore repeated calls
    
    chain(done, function () {
        this(null, shutdown._keys = Object.keys(shutdown).sort());

    }, function callee(keys) {
        if (arguments.length > 1 && exports.debug)
            exports.debug.apply(null, Array.prototype.slice.call(arguments, 1));
        if (!keys.length) return this();
        var key = keys.shift();
        shutdown[key](callee.bind(this, keys));

    }, function () {
        pidFd ? fs.close(pidFd, this.ignore) : this();

    }, function () {
        pidFile ? fs.unlink(pidFile, this.ignore) : this();

    }, function () {
        this();
    });
}

module.exports = exports = extend(function debugRepl(module, name, norepl) {
    if (typeof name !== 'string') {
        norepl = name;
        name = path.basename(module.filename, '.js');
    }
    norepl = norepl || !process.stdin.isTTY || !process.stdout.isTTY || process.mainModule !== module;
    if (!norepl)
        debugRepl.repl = require('repl')
            .start({ useGlobal: true, ignoreUndefined: true })
            .on('exit', exports.shutdown);
    !norepl && process.nextTick(function () {
        Object.keys(module.exports).forEach(function (key, i, a) { global[key] = module.exports[key] });
    });
    return extend(debug(name), { shutdown: exports.shutdown });
}, exports);

process.mainModule && process.nextTick(function () {
    if (exports.repl) return;

    process.on('SIGHUP', Function.prototype); // systemctl reload <service>
    process.once('SIGTERM', exports.shutdown); // systemctl stop <service>
    process.once('SIGINT', exports.shutdown); // console-app CTRL-C

    exports.pidDir = exports.pidDir || '/run';
    exports.pidBase = exports.pidBase || path.basename(process.mainModule.filename, '.js');
    exports.pidExt = exports.pidExt || '.pid';
    pidFile = path.resolve(exports.pidDir, exports.pidBase + exports.pidExt);

    chain(null, function () {
        fs.open(pidFile, 'w', parseInt(644, 8), this);

    }, function (fd) {
        var buffer = Buffer(process.pid + os.EOL);
        fs.write(pidFd = fd, buffer, 0, buffer.length, null, this);

    }, function (written, string) {
        this();

    });
});
