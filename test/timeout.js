var ttl = require('../ttl')(10)
var tape = require('tape')

tape('simple', function (t) {
  ttl.add('foo')
  t.equal(ttl.check('foo'), true)

  setTimeout(function () {
    t.equal(ttl.check('foo'), false)
    t.end()
  }, 100)
})

