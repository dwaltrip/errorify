'use strict';

var through = require('through2');

// https://github.com/sindresorhus/ansi-regex/blob/47fb974/index.js
var ansiRegex = /(?:(?:\u001b\[)|\u009b)(?:(?:[0-9]{1,3})?(?:(?:;[0-9]{0,3})*)?[A-M|f-m])|\u001b[A-M]/g;

function template(error) {
  /*eslint-env browser*/
  console.error(error);
  if (typeof document === 'undefined') return;
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', print);
  } else {
    print();
  }
  function print() {
    var pre = document.createElement('pre');
    pre.className = 'errorify';
    pre.textContent = error.message || error;
    if (document.body.firstChild) {
      document.body.insertBefore(pre, document.body.firstChild);
    } else {
      document.body.appendChild(pre);
    }
  }
}

function replace(err) {
  //normalize error properties
  err = {
    message: err.annotated || err.message,
    lineNumber: typeof err.line === 'number' ? err.line : err.lineNumber,
    columnNumber: typeof err.column === 'number' ? err.column : err.columnNumber,
    name: err.name,
    stack: err.stack,
    fileName: err.fileName
  };

  var result = {};
  Object.keys(err).forEach(function(key) {
    var val = err[key];
    if (typeof val !== 'undefined') {
      result[key] = typeof val === 'number'
            ? val
            : String(val).replace(ansiRegex, '');
    }
  });

  return '!' + template + '(' + JSON.stringify(result) + ')';
}

module.exports = function errorify(b, opts) {
  var bundle = b.bundle.bind(b);
  b.bundle = function(cb) {
    var output = through();
    var pipeline = bundle(cb);
    var errored;
    pipeline.on('error', function(err) {
      if (!errored) {
        errored = true;
        console.error('errorify: %s', err);
        output.push(replace(err));
        output.push(null);
        pipeline.unpipe(output);
      }
    });
    pipeline.pipe(output);
    return output;
  };
};
