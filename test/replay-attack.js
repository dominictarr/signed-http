var http    = require('http')
var sr      = require('../')
var os      = require('os')
var join    = require('path').join
var tape    = require('tape')
var request = require('request')

var tmpdir = (os.tmpdir || os.tmpDir)()
var pair   = sr.loadOrGenerateSync(join(tmpdir, 'http-signature-testkey'))
var pair2  = sr.loadOrGenerateSync(join(tmpdir, 'http-signature-testkey2'))

tape('test sign', function (t) {

  var headers

  var server = http.createServer(
    sr(function (req, res) {
      headers = req.headers
      res.end('ok')
    }, {
      getPublicKey: function (id, cb) {
        cb(null, pair.public)
      }
    })
  ).listen(0, function () {
    
    var body = new Buffer('hello')

    var url = 'http://localhost:' + server.address().port
    sr.request(pair, {
      url: url,
      body: body
    }, function (err, res, body) {
      t.equal(res.statusCode, 200)

      request({
        url: url,
        headers: headers
      }, function (err, res, body) {
        console.log(res.statusCode, body)
        server.close()
        t.equal(res.statusCode, 401)
        t.equal(body, 'replay detected')
        t.end()
      })
    })
  })
})

