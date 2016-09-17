const { Document } = require('./document')
const { Runtime } = require('./runtime')
const { clonePlainObject } = require('./util')

class Instance {
  constructor (runtime) {
    this._runtime = runtime || new Runtime()
    this._target = this._runtime.target
    this.id = this._runtime._genInstanceId().toString()
    this._runtime.instanceMap[this.id] = this
    this.doc = new Document(this.id)
    this.lastDoc = null
    this.active = true
    this.watchers = []
    this.extension = {}
    this.spyMap = {}
    this.history = {
      callNative: [],
      callJS: [],
      refresh: []
    }
    this._initCall()
  }
  _initCall () {
    const runtime = this._runtime
    const target = this._target
    target.callNative = (id, tasks) => {
      if (!this.active) {
        return
      }
      if (this.id !== id) {
        return
      }
      tasks.forEach(task => {
        // Execute real or mocked module API.
        const module = runtime.modules[task.module] || {}
        const method = module[task.method]
        if (this.spyMap[task.module] && this.spyMap[task.module][task.method]) {
          const args = clonePlainObject(task.args)
          args.unshift(method)
          args.unshift(this.doc)
          args.unshift(this)
          this.spyMap[task.module][task.method].apply(null, args)
        }
        else if (method) {
          const args = clonePlainObject(task.args)
          args.unshift(this.doc)
          args.unshift(this)
          method.apply(null, args)
        }

        // Record callNative history.
        const taskHistory = clonePlainObject(task)
        taskHistory.timestamp = Date.now()
        this.history.callNative.push(taskHistory)

        // Call the watchers on this task
        this.watchers.forEach(caller => {
          if (!caller.moduleName || task.module === caller.moduleName) {
            if (!caller.methodName || task.method === caller.methodName) {
              const args = clonePlainObject(task.args)
              if (!caller.methodName) {
                args.unshift(task.method)
              }
              if (!caller.moduleName) {
                args.unshift(task.module)
              }
              caller.handler.apply(null, args)
            }
          }
        })
      })
    }
  }

  $create (code, config, data) {
    if (!this.active) {
      return
    }
    const target = this._target
    this.history.refresh.push({
      type: 'createInstance',
      timestamp: Date.now(),
      config: clonePlainObject(config || {}),
      data: clonePlainObject(data || {})
    });
    ((callNative) => {
      target.createInstance(
        this.id, code,
        clonePlainObject(config || {}),
        clonePlainObject(data || {})
      )
    })(this._target.callNative.bind(this._target))
  }
  $refresh (data) {
    if (!this.active) {
      return
    }
    const target = this._target
    this.history.refresh.push({
      type: 'refreshInstance',
      timestamp: Date.now(),
      data: clonePlainObject(data)
    })
    target.refreshInstance(
      this.id,
      clonePlainObject(data)
    )
  }
  $destroy () {
    if (!this.active) {
      return
    }
    const runtime = this._runtime
    const target = this._target
    this.lastDoc = this.doc
    this.doc = null
    this.history.refresh.push({
      type: 'destroyInstance',
      timestamp: Date.now()
    })
    target.destroyInstance(this.id)
    delete runtime.instanceMap[this.id]
  }
  $fireEvent (ref, type, data, domChanges) {
    if (!this.active) {
      return
    }
    const target = this._target
    this.history.callJS.push({
      method: 'fireEvent',
      timestamp: Date.now(),
      args: clonePlainObject([ref, type, data, domChanges])
    })
    target.receiveTasks(this.id, [{
      method: 'fireEvent',
      args: clonePlainObject([ref, type, data, domChanges])
    }])
  }
  $callback (funcId, data, ifLast) {
    if (!this.active) {
      return
    }
    const target = this._target
    this.history.callJS.push({
      method: 'callback',
      timestamp: Date.now(),
      args: clonePlainObject([funcId, data, ifLast])
    })
    target.receiveTasks(this.id, [{
      method: 'callback',
      args: clonePlainObject([funcId, data, ifLast])
    }])
  }
  $getRoot () {
    if (!this.active) {
      return
    }
    const target = this._target
    return clonePlainObject(target.getRoot(this.id))
  }

  oncall (moduleName, methodName, handler) {
    if (typeof moduleName === 'function') {
      handler = moduleName
      methodName = ''
      moduleName = ''
    }
    if (typeof methodName === 'function') {
      handler = methodName
      methodName = ''
    }
    if (!this.watchers.filter(caller => caller.handler === handler).length) {
      this.watchers.push({ moduleName, methodName, handler })
    }
  }
  mockModuleAPI (moduleName, methodName, handler) {
    if (!this.spyMap[moduleName]) {
      this.spyMap[moduleName] = {}
    }
    this.spyMap[moduleName][methodName] = handler
  }
  getRealRoot () {
    return this.doc.body ? this.doc.body.toJSON() : {}
  }
  watchDOMChanges (element, handler) {
    if (typeof element === 'function') {
      handler = element
      element = this.doc.body
    }
    element.$addListener(this.doc, handler)
  }

  play () {
    this.active = true
  }
  pause () {
    this.active = false
  }
}

exports.Instance = Instance
