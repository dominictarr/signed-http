var http = require('http')
var sr   = require('../')
var os   = require('os')
var join = require('path').join
var tape = require('tape')

var tmpdir = (os.tmpdir || os.tmpDir)()
var pair   = sr.loadOrGenerateSync(join(tmpdir, 'http-signature-testkey'))
var pair2  = sr.loadOrGenerateSync(join(tmpdir, 'http-signature-testkey2'))

function getPort () {
  return ~~(1000 + Math.random()*50000)
}

tape('test sign', function (t) {

  var server = http.createServer(
    sr(function (req, res) {
      res.end('ok')
    }, {
      getPublicKey: function (id, cb) {
        cb(null, pair.public)
      }
    })
  ).listen(0, function () {
    
    var body = new Buffer('hello')

    sr.request(pair, {
      url: 'http://localhost:' + server.address().port,
      body: body
    }, function (err, res, body) {
      server.close()
      t.equal(res.statusCode, 200)
      t.end()
    })
  })
})

tape('test invalid', function (t) {
  var server = http.createServer(
    sr(function (req, res) {
      res.end('ok')
    }, {
      getPublicKey: function (id, cb) {
        cb(null, pair2.public)
      }
    })
  ).listen(0, function () {

    var body = new Buffer('hello')

    sr.request(pair, {
      url: 'http://localhost:' + server.address().port,
      body: body
    }, function (err, res, body) {
      server.close()
      t.equal(res.statusCode, 401)
      t.end()
    })
  })
})


