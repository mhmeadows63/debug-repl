#! /usr/bin/env node
// require the the debug-repl module and this module
var debug = require(__dirname + '/index')(module);

// set a module variable to be exported to the GLOBAL object
exports.foo = 'bar';

// set a timer for 5s
exports.timeout = setTimeout(debug.bind(null, exports.foo), 5000);

// setup a function to be called on SIGTERM, SIGINT and repl-exit
debug.shutdown['20timeout'] = function timeout(done) {
    exports.timeout = clearTimeout(exports.timeout);
    done();
};

process.on('SIGHUP', console.log.bind(console, 'reload'));
setTimeout(process.kill.bind(process, process.pid, 'SIGHUP'), 1000);
setTimeout(process.kill.bind(process, process.pid, 'SIGINT'), 3000);
