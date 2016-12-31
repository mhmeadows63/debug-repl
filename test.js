#! /usr/bin/env node
// require the the debug-repl module, providing this module to the initialiser
var debug = require('.')(module);

// set a module variable to be exported to the GLOBAL object
exports.foo = 'bar';

// set a timer for 5s - something to cleanup on shutdown
exports.timeout = setTimeout(debug.bind(null, exports.foo), 5000);

// setup a function to be called on SIGTERM, SIGINT and repl-exit
debug.shutdown['50timeout'] = function timeout(done) {
    debug('shutdown', debug.callsite);
    exports.timeout = clearTimeout(exports.timeout);
    done();
};

process.on('SIGHUP', function sighup() {
    debug('reload', debug.callsite);
});
setTimeout(process.kill.bind(process, process.pid, 'SIGHUP'), 1000); // invoke sighup()
setTimeout(process.kill.bind(process, process.pid, 'SIGINT'), 3000); // invoke shutdown()
