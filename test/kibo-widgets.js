"use strict";

var url = require('url');
var chai = require('chai');
var through = require('through');
var widgets = require('../index.js');

var log = require('debug')('test:kibo-widgets');

var expect = chai.expect;

describe('WidgetBox', function () {

  function buildRes(done){
    var res = through(function onData(data) {
      log('data', data.toString())
      expect(data).to.exist;
    }, function onEnd() {
      if(done) done()
    });

    res.send = function(code){
      throw new Error(code)
    };

    return res;
  }

  before(function(){
    log('before')
    widgets.initialize({/* accessToken: 'XXXX' */});
  })

  it('should retrieve parse URL and proxy specified gist', function (done) {

    // https:/gist.github.com/jmanoto/5801901/raw/options.js

    widgets.getGist({url: '/gist/jmanoto/5801901/options.js', path: '/gist/jmanoto/5801901/options.js'}, buildRes(done));

  })

  it('should validate url params and raise an error', function () {

    // https:/gist.github.com/jmanoto/5801901/raw/options.js
    expect(widgets.getGist.bind(null, {url: '/gist/jmanoto/58--01901/options.js', path: '/gist/jmanoto/5801901/options.js'}, buildRes())).to.throw(Error);

  })
});
