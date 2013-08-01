"use strict";

var paramify = require('paramify');
var hyperquest = require('hyperquest');
var concat = require('concat-stream');
var joi = require('joi');
var T = joi.types;
var url = require('url');
var path = require('path');
var log = require('debug')('kibo-widgets');

var schema = {
  gistParams: {
    githubUser: T.String().regex(/[a-zA-Z\-]+/).required(),
    gistId: T.Number().required(),
    fileName: T.String().valid('options.js', 'style.less', 'view.html', 'widget.js').required()
  }
};

function proxy(uri, res, opts) {

  var status = 500;

  var write = concat(function(data) {
    log('concat', uri, status);
    if(status == 200){
      res.write(data);
      res.end()
    } else {
      res.send(status)
    }
  });

  hyperquest(url.resolve('https://gist.github.com', uri), opts)
    .on('response', function (response) {
      log('proxy', uri, response.statusCode);
      status = response.statusCode;
    }).pipe(write)

}

/**
 * Setup an optional access token for use when requesting data from github.
 *
 * @param options
 * @returns {Function}
 */
exports.initialize = function (options) {

  this.accessToken = options.accessToken;

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
  var opts = this.accessToken ? {'access_token': this.accessToken} : {};

  log('gist', 'get', req.url, opts);

  if(match('widgets/gist/:githubUser/:gistId/:fileName')){
    var error = joi.validate(match.params, schema.gistParams);
    if (error){
      log('gist', 'params', 'errors', error);
      res.send(400);
    } else {
      proxy(path.join(match.params.githubUser, match.params.gistId, 'raw', match.params.fileName), res, opts);
    }
  } else {
    res.send(400);
  }

};

