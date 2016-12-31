# debug-repl
A combination of the well-known [debug](https://www.npmjs.com/package/debug) 
module with ordered shutdown logic, a useful 
[callsite](https://github.com/v8/v8/wiki/Stack%20Trace%20API) getter and 
conditional auto-spawning of 
[REPL](https://nodejs.org/dist/latest-v4.x/docs/api/repl.html)

```js
#! /usr/bin/env node
// require the debug-repl module, providing this module to the initialiser
var debug = require('debug-repl')(module);

// set a module variable to be exported to the GLOBAL object for user inspection
exports.foo = 'bar';

// set a timer of 5 secs
exports.timeout = setTimeout(debug.bind(null, exports.foo), 5000);

// setup a function to be called on SIGTERM, SIGINT and repl-exit
debug.shutdown['50timeout'] = function timeout(done) {
    debug(debug.callsite); // test Array { file: 'test.js', line: 13, colm: 16, func: 'timeout' } +2s
    exports.timeout = clearTimeout(exports.timeout);
    done(); // this is required for subsequent shutdown functions to be called
};
```

## Version Differences

  * v2-v3
    * switched to using the PIDFILE environment variable for enabling and 
    locating the pidfile
    * added the callsite getter
  * v1-v2
    * eliminated a 2nd copy of the module.exports to the global object
    * added a means to log arguments to the shutdown-done callbacks
    * now explicitly testing whether the passed module is the process.mainModule
    * added a means to change the location of the PID file

## Installation

```bash
$ npm install debug-repl --save
```

## Features

  * Creates a `debug` function using the name of the current module
  * Spawns a REPL if the current-module is the main-module
  * Registers a `shutdown` function with SIGTERM, SIGINT and REPL-exit
  * Protects against SIGHUP by registering a _null-function_
  * Exposes the `shutdown` dictionary-object as an attribute on every `debug`
  function
  * Exposes the `callsite` getter on every debug function to fetch the calling 
  file, line, column and function-name as attributes of a callsite-array
  
## Purpose

This module provides four elements that are often useful together:

  1. Automatic naming of `debug` functions that cope with code refactoring
  2. Activation of REPL in a NodeJS application under Development, but not in 
  Production.
  3. Ordered clean shutdown of application components.
  4. A `callsite` getter for generically identifying a file/line and call-stack.

## Detail

### `var debug = require('debug-repl')(module[, name][, norepl]);`

Yields the same function-object that would return from `require('debug')(name);`
 with the addition of `shutdown` and `callstate` atttributes.

A REPL is spawned only if the following conditions are met:

  * `norepl` is falsy (or absent)
  * STDIN is a TTY
  * STDOUT is a TTY
  * the supplied module is the process.mainModule
  
The `debug.shutdown` attribute is an dictionary-object to which functions can 
be added by name. Application shutdown is triggered by any one of the following:

  1. quitting the REPL
  2. receipt of SIGTERM
  3. receipt of SIGINT

When the shutdown is triggered, all dictionary-keys are harvested from the 
shutdown dictionary-object, sorted alpha-numerically and then executed in turn. 
Each supplied shutdown function is given a `done` callback parameter to call 
when complete. Any parameters passed to the `done` callback are discarded and 
the next shutdown function is called.

For example, consider a webservice connected to a backend database. On shutdown,
the HTTP server would be closed first, then once all HTTP clients have 
disconnected, the database connection would be closed. To this end, HTTP and 
Database shutdown functions might be set as follows:

```js
debug.shutdown['30httpserver'] = function (done) {
    server.close(done);
};
debug.shutdown['60database'] = function (done) {
    db.end(done);
};
```

If a function is assigned to the `debug` attribute on the `debug-repl` 
module-object, then any parameters passed to the `done` callbacks are passed as 
arguments to this function for possible logging.

Once all shutdown functions have been called, the NodeJS event-engine should be
free to exit. If any timer or i/o handles remain, the application will persist.

## Usage with Linux __systemd__

A [systemd.service](https://www.freedesktop.org/software/systemd/man/systemd.service.html) 
unit-file of the following general form can start/stop/reload
a NodeJS application as a Service:

```
# file: /etc/systemd/system/example.service
[Unit]
Description=An Example NodeJS Service Application
After=network.service
Requires=network.service

[Service]
Environment=PIDFILE=/run/example.pid
ExecStart=/usr/local/bin/example.js
ExecReload=/usr/sbin/fuser -HUP -ks $PIDFILE

[Install]
WantedBy=multi-user.target
```

Defining the PIDFILE environment variable causes this module to write 
`process.pid` to the specified filename and to retain the open 
file-handle allowing `fuser` to signal the process as required.

## License

  [MIT](LICENSE)
