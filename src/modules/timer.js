function _setTimeout (instance, document, funcId, timeout) {
  instance.extension.timer = instance.extension.timer || {}
  instance.extension.timer[funcId] = setTimeout(() => {
    instance.$callback(funcId, null, true)
  }, timeout || 0)
}

function _clearTimeout (instance, document, funcId) {
  instance.extension.timer = instance.extension.timer || {}
  clearTimeout(instance.extension.timer[funcId])
}

function _setInterval (instance, document, funcId, timeout) {
  instance.extension.timer = instance.extension.timer || {}
  instance.extension.timer[funcId] = setInterval(() => {
    instance.$callback(funcId, null, false)
  }, timeout || 0)
}

function _clearInterval (instance, document, funcId) {
  instance.extension.timer = instance.extension.timer || {}
  clearInterval(instance.extension.timer[funcId])
}

exports.setTimeout = _setTimeout
exports.clearTimeout = _clearTimeout
exports.setInterval = _setInterval
exports.clearInterval = _clearInterval
