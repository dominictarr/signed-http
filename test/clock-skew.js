var http = require('http')
var sr   = require('../')
var os   = require('os')
var join = require('path').join
var tape = require('tape')

var tmpdir = (os.tmpdir || os.tmpDir)()
var pair   = sr.loadOrGenerateSync(join(tmpdir, 'http-signature-testkey'))

//test that can get clock skew errors
tape('test skew', function (t) {

  var server = http.createServer(
    sr(function (req, res) {
      res.end('ok')
    }, {
      getPublicKey: function (id, cb) {
        cb(null, pair.public)
      },
      maxSkew: -1000
    })
  ).listen(0, function () {
    
    var body = new Buffer('hello')

    sr.request(pair, {
      url: 'http://localhost:' + server.address().port,
      body: body
    }, function (err, res, body) {
      server.close()
      t.equal(res.statusCode, 400)
      t.ok(/clock skew/.test(body))
      console.error(res.statusCode, body)
      t.end()
    })
  })
})

