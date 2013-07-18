
//remember signatures that have occured within a time.

module.exports = function (time) {
  time = time || 1000
  var keys = {}
  var hist = []

  function cleanup() {
    var n = Date.now()
    while(hist.length) {
      var item = hist[0]
      if(keys[item] > n) return

      hist.shift()
      delete keys[item]
    }
  }

  return {
    add: function (item) {
      keys[item] = Date.now() + time
      hist.push(item)
    },
    check: function (item) {
      var t = keys[item] > Date.now()
      cleanup()
      return t
    }
  }
}
