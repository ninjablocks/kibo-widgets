"use strict";

var paramify = require('paramify');
var concat = require('concat-stream');
var joi = require('joi');
var T = joi.types;
var url = require('url');
var path = require('path');
var log = require('debug')('kibo-widgets');
var retryRequest = require('./retry-stream.js')

var NUM_TRIES = 3 // adjust up and down to test.

var internal = {};

var schema = {
  gistParams: {
    githubUser: T.String().regex(/[a-zA-Z\-]+/).required(),
    gistId: T.String().alphanum().required(),
    fileName: T.String().valid('options.js', 'style.less', 'view.html', 'widget.js').required()
  },
  githubRepoParams: {
    githubUser: T.String().regex(/[a-zA-Z\-]+/).required(),
    githubRepo: T.String().regex(/[a-zA-Z\-]+/).required(),
    branch: T.String().regex(/[a-zA-Z\-]+/).required(),
    fileName: T.String().valid('options.js', 'style.less', 'view.html', 'widget.js').required()
  }
};

function gistProxy(uri, res, opts) {

  var status = 502;

  retryRequest(url.resolve('https://gist.githubusercontent.com', uri), opts, NUM_TRIES).on('error',function () {
    res.send(status)
  }).on('error',function (err) {
      log('error', err)
      res.send(status)
    }).pipe(concat(function (data) {
      log('success', 'data.length', data.length)
      res.write(data);
      res.end()
    }))

}

function githubRepoRawProxy(uri, res, opts) {
  var status = 502;

  retryRequest(url.resolve('https://raw.github.com', uri), opts, NUM_TRIES).on('error', function(){
      res.send(status)
    }).on('error', function(err){
      log('error', err)
      res.send(status)
    }).pipe(concat(function(data) {
      log('success', 'data.length', data.length)
      res.write(data);
      res.end()
    }))
}

/**
 * Setup an optional access token for use when requesting data from github.
 *
 * @param options
 * @returns {Function}
 */
exports.initialize = function (options) {

  internal.accessToken = options.accessToken;

  return function (req, res, next) {
    next()
  }
};

/**
 * Validates the parameters from the given request URL then retrieves the gist if available.
 *
 * @param req
 * @param res
 */
exports.getGist = function(req, res){

  var match = paramify(req.url);
  var opts = {};

  if (internal.accessToken)
    opts.headers =  {'Authorization': 'token ' + internal.accessToken}

  log('gist', 'get', req.url, opts);

  var error;
  if(match('widgets/gist/:githubUser/:gistId/:fileName')){
    error = joi.validate(match.params, schema.gistParams);
    if (error){
      log('gist', 'params', 'errors', error);
      res.send(400);
    } else {
      gistProxy(path.join(match.params.githubUser, match.params.gistId, 'raw', match.params.fileName), res, opts);
    }
  } else if (match('widgets/github/:githubUser/:githubRepo/:branch/widget/:fileName')) {
    error = joi.validate(match.params, schema.githubRepoParams);
    if (error){
      log('githubRepo', 'params', 'errors', error);
      res.send(400);
    } else {
      githubRepoRawProxy(path.join(match.params.githubUser, match.params.githubRepo, match.params.branch, 'widget', match.params.fileName), res, opts);
    }
  } else {
    res.send(400);
  }

};

