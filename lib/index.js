const { EventEmitter } = require("events")

class Connector extends EventEmitter {
  constructor() {
    super()
  }
  start(device, callback) {
    console.log(device)
    callback()
  }
}

module.exports = Connector
