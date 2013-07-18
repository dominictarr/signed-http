# signed-http

Use joyent's http signature scheme for http auth.

[![travis](https://travis-ci.org/dominictarr/hello-http-signature.png?branch=master)
](https://travis-ci.org/dominictarr/hello-http-signature)

see [http-signature](https://npmjs.org/package/http-signature)
and [http-signature spec](https://github.com/joyent/node-http-signature/blob/master/http_signing.md)

Provides a http middleware and a few small helpers.
`signed-http` will sign the hash of the body by default,
for maximum security.

`signed-http` also, checks for replayed and out of date requests,
(note: replay is possible after server restarts, if replayed request is recent)

I strongly recommend that all http routes are idempotent.

## Example

create a server

``` js
var http = require('http')
var sr = require('signed-http')

//get a key pair
//this will block the process for a few seconds.
var pair = sr.loadOrGenerateSync ('/tmp/testkeys', {silent: false})

http.createServer(sr(
  function (req, res) {
    //this only gets called if the request was successfully signed.
    //it is still your job to decide whether that user may access that resource!
    res.end('ok')
  },
  {
    getPublicKey: function (id, cb) {
      //must provide a function to retrive a public key!
      cb(null, pair.public)
    },
    //demand that the date on the request is within
    //5 minutes of current time (joyent's recommendation, the default)
    maxSkew: 300*1000
  }
)).listen(8080)
```

Then, post a request to it. `signed-http` will set sensible defaults on the
request for maximum security.

``` js
var pair = sr.loadOrGenerateSync ('/tmp/testkeys', {silent: false})

rs.request(pair,{
  url: 'http://localhost:8080/',
  body: new Buffer('hello there!')
}, function (err, res, body) {
  //received response...
  console.log(req.statusCode, body)
})
```

## License

MIT
