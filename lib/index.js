const debug = require('debug')('meshblu-connector-storefront-ica:Connector')
const { EventEmitter } = require("events")
const bindAll = require('lodash/fp/bindAll')
const get = require('lodash/fp/get')
const PowerShell = require("./powershell")
const path = require("path")
const tmp = require('tmp')
tmp.setGracefulCleanup()

class Connector extends EventEmitter {
  constructor() {
    super()
    bindAll(Object.getOwnPropertyNames(Connector.prototype), this)
    this.powershell = new Powershell({ child_process: require("child_process") })
  }

  start(device, callback) {
    callback()
  }

  onConfig(device) {
    generateAndLaunch(device.options)
  }

  generateAndLaunch({ storeFrontUrl, username, password, domain, desktop }) {
    tmp.tmpName({ postfix: '.ica' }, (tmpNameError, filename) => {
      if (tmpNameError) return console.error(tmpNameError)
      const args = [
        "-sfurl",
        storeFrontUrl,
        "-icapath",
        filename,
        "-username",
        username,
        "-password",
        device,
        "-domain",
        domain,
        "-desktop",
        desktop,
      ]
      this.powershell.run(path.join(__dirname, '../scripts/generate-and-launch-with-explicit-auth.ps1'), args, (error, output) => {
        if (error) {
          return console.error(error)
        }
        debug('output', output)
      })
    })
  }
}

module.exports = Connector
