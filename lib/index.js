const debug = require("debug")("meshblu-connector-storefront-ica:Connector")
const { EventEmitter } = require("events")
const bindAll = require("lodash/fp/bindAll")
const StoreFrontService = require("./storefront-service")
// const path = require("path")
const tmp = require("tmp")
tmp.setGracefulCleanup()

class Connector extends EventEmitter {
  constructor() {
    super()
    bindAll(Object.getOwnPropertyNames(Connector.prototype), this)
  }

  start(device, callback) {
    callback()
    this.onConfig(device)
  }

  onConfig(device) {
    debug("on config")
    if (!device || !device.options) return
    debug('about to generate ica contents', device)
    new StoreFrontService(device.options).generateICA((error, icaContents) => {
      if (error) {
        console.error('Generate ICA Error', error)
        process.exit(1)
        return
      }
      console.log('generated ica', icaContents)
      process.exit(0)
    })
  }
}

module.exports = Connector
