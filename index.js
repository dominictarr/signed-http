var fs = require('fs')

var signature = require('http-signature')
var request   = require('request')
var keypair   = require('keypair')
var shasum    = require('shasum')

var toPull    = require('stream-to-pull-stream')
var pull      = require('pull-stream')

var TTL       = require('./ttl')

function buffer(stream, cb) {
  pull(toPull(stream), pull.collect(function (err, ary) {
    if(err) return cb(err)
    var b = Buffer.concat(ary)
    cb(null, b)
  }))
}

exports = module.exports = function (handler, opts) {
  opts = opts || {}
  var getPublicKey = opts.getPublicKey

  var maxSkew = opts.maxSkew || 300e3 //300 seconds
  var ttl = TTL(maxSkew * 2)

  return function (req, res, next) {
    var errored = false
    function error (status, message) {
      if(errored) return
      req.verified = false
      var e = new Error(message)
      e.status = status
      if(next) return next(e)
      res.writeHead(status); res.end(message)
    }

    if(Math.abs(new Date(req.headers.date) - new Date()) > maxSkew)
      return error(400, 'clock skew exceeds '+(maxSkew/1e3) + ' seconds')

    var parsed = signature.parseRequest(req)

    if(!parsed.params)
      return error(400, 'request must be signed')
  
    //check for replay attacks...
    //note, signatures are only stored in memory
    //so if the server is restarted, then replays are possible
    //however, unless the request is recent, it will be caught by
    //the maxSkew check.
    //Anyway, requests should be idempotent,
    //so that replays do nothing.
    var sighash = shasum(parsed.params.signature)
    if(ttl.check(sighash))
      return error(401, 'replay detected')

    //remember signatures for up to 2 times the maxSkew.
    ttl.add(sighash)

    getPublicKey(parsed.keyId, function (err, publicKey) {
      if(err)
        return error(403, err.message)

      if(!signature.verifySignature(parsed, publicKey))
        return error(401, 'signature invalid')
      else
        req.verified = true

      if(req.verified && req.body !== undefined)
        handler(req, res, next)
    })

    buffer(req, function (err, body) {
      req.body = body || null
      if(req.body && shasum(req.body, 'md5') !== req.headers['content-md5'])
        return error(400, 'invalid content-md5')
      else if(req.verified)
        handler(req, res, next)
    })
  }
}


exports.loadOrGenerateSync = function (file, opts) {
  
  var pair

  try {
    pair = {
      private: fs.readFileSync(file, 'utf8'),
      public: fs.readFileSync(file + '.pub', 'utf8')
    }
  } catch (err) {
    //this blocks the process, so inform the users something is happening...
    if(!opts || !opts.silent)
      console.error('generating keys:', file)
    pair = keypair()
    fs.writeFileSync(file, pair.private, 'utf8')
    fs.writeFileSync(file + '.pub', pair.public, 'utf8')
  }

  pair.id = shasum(pair.public)
  return pair
}

//since it's probably just client cli tools using this,
//it's probably fine that it's sync...

exports.request = function (pair, opts, cb) {

  var fields = ['request-line', 'date', 'content-length']
  opts.headers = opts.headers || {}
  opts.headers['content-length'] = 0
  
  opts.httpSignature = {
    key: pair.private,
    keyId: pair.id,
    headers: fields
  }

  if(opts.json) {
    opts.body = new Buffer(JSON.stringify(opts.json))
    delete opts.json
  }

  if(opts.body) {
    opts.headers = {
      'content-md5': shasum(opts.body, 'md5'),
      'content-length': opts.body.length
    } 
    fields.push('content-md5')
  }

  request(opts, cb)

}

