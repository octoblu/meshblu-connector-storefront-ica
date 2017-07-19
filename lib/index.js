const debug = require("debug")("meshblu-connector-storefront-ica:Connector")
const { EventEmitter } = require("events")
const bindAll = require("lodash/fp/bindAll")
const StoreFrontService = require("./storefront-service")
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
    this.generateICAFile(device.options)
  }

  generateICAFile(options) {
    tmp.tmpName({ postfix: ".ica" }, (error, icaFilePath) => {
      if (error) return console.error(error)
      options.icaFilePath = icaFilePath
      new StoreFrontService(options).generateICAFile((error) => {
        if (error) {
          console.error('Generate ICA Error', error)
          process.exit(1)
          return
        }
        process.exit(0)
      })
    })
  }
}

module.exports = Connector
