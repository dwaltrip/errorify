/*eslint-disable no-shadow*/
'use strict';

var browserify = require('browserify');
var test = require('tape');
var through = require('through2');
var vm = require('vm');

var concat = require('concat-stream').bind(null, {encoding: 'string'});

function contains(source, searchValue) {
  return source.toString().indexOf(searchValue) !== -1;
}

// Types of Browserify errors: Bad syntax, missing dependency, or a transform error
// Error can happen in the Entry file, or in Dependency

test('errorify', function(t) {

  var errorify = require('../');

  var ERROR_PRELUDE = '(typeof alert=="function"?alert:console.error)';

  t.test('exports', function(t) {
    t.equal(typeof errorify, 'function', 'should export a function');
    t.end();
  });

  t.test('successful build with repeat "bundle" calls', function(t) {
    t.plan(2);
    var b = browserify();
    b.require('./test/fixtures/good/entry.js', {expose: 'entry'});
    b.plugin(errorify);
    b.bundle()
      .pipe(concat(function(src) {
        var c = {};
        vm.runInNewContext(src, c);
        t.equal(typeof c.require('entry').dep1.dep2.identity, 'function', 'should work with pipe');
      }));
    b.bundle()
      .pipe(concat(function(src) {
        var hasError = contains(src, ERROR_PRELUDE);
        t.notOk(hasError, 'should not have error message with pipe');
      }));
  });

  t.test('bad syntax in entry file', function(t) {
    t.plan(1);
    var b = browserify('./test/fixtures/bad-syntax-entry.js');
    b.plugin(errorify);
    b.bundle()
      .pipe(concat(function(src) {
        var hasError = contains(src, ERROR_PRELUDE);
        t.ok(hasError, 'should have error message when there is a syntax error in the entry');
      }));
  });

  t.test('bad syntax in dep file', function(t) {
    t.plan(1);
    var b = browserify('./test/fixtures/bad-syntax-dep/entry.js');
    b.plugin(errorify);
    b.bundle()
      .pipe(concat(function(src) {
        var hasError = contains(src, ERROR_PRELUDE);
        t.ok(hasError, 'should have error message when there is a syntax error in dep');
      }));
  });

  t.test('missing dependency in entry file', function(t) {
    t.plan(1);
    var b = browserify('./test/fixtures/missing-dep-entry.js');
    b.plugin(errorify);
    b.bundle()
      .pipe(concat(function(src) {
        var hasError = contains(src, ERROR_PRELUDE);
        t.ok(hasError, 'should have error message when entry is missing a dep');
      }));
  });

  t.test('missing dependency in dependency file', function(t) {
    t.plan(1);
    var b = browserify('./test/fixtures/missing-dep-dep/entry.js');
    b.plugin(errorify);
    b.bundle()
      .pipe(concat(function(src) {
        var hasError = contains(src, ERROR_PRELUDE);
        t.ok(hasError, 'should have error message when dep is missing a dep');
      }));
  });

  test.only('error in transform', function(t) {
    t.plan(1);
    var b = browserify('./test/fixtures/good/entry.js');
    b.transform(function() {
      return through(function(chunk, enc, cb) {
        this.emit('error', new Error());
        cb();
      });
    });
    b.plugin(errorify);
    b.bundle()
      .pipe(concat(function(src) {
        var hasError = contains(src, ERROR_PRELUDE);
        t.ok(hasError, 'should have error message when transform fails on entry');
      }));
  });

  t.end();
});
