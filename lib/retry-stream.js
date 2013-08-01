"use strict";
/*
 * Retry Stream
 */
var hyperquest = require('hyperquest');
var through = require('through');
var log = require('debug')('kibo-widgets:retry-stream');

module.exports = exports = function retryRequest(url, opts, times) {
  log('retryRequest', url, opts)
  var result = through();
  result.pause();
  req(times)
  return result;

  function req(count) {
    if (!count) {result.emit('error', 'too many retries'); result.end()}
    log('try %d of %d.', times - count + 1, times)

    var buffer = through();

    hyperquest(url, opts)
      .on('response', function(res) {
        if (res.statusCode !== 200) {
          req(count - 1)
        } else {
          buffer.pipe(result);
          buffer.resume();
        }
      })
      .pipe(buffer)
      .pause()
  }
};