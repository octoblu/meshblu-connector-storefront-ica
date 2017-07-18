const debug = require("debug")("meshblu-connector-storefront-ica:Connector")
const { EventEmitter } = require("events")
const bindAll = require("lodash/fp/bindAll")
const Powershell = require("./powershell")
const path = require("path")
const tmp = require("tmp")
tmp.setGracefulCleanup()

class Connector extends EventEmitter {
  constructor() {
    super()
    bindAll(Object.getOwnPropertyNames(Connector.prototype), this)
    this.powershell = new Powershell({ child_process: require("child_process") })
  }

  start(device, callback) {
    callback()
    this.onConfig(device)
  }

  onConfig(device) {
    debug("on config")
    if (!device || !device.options) return
    if (device.options.username && device.options.password) {
      this.generateAndLaunchWithExplicitAuth(device.options)
    } else {
      this.generateAndLaunchWithGatewayAuth(device.options)
    }
  }

  generateAndLaunchWithExplicitAuth({ storeFrontUrl, username, password, domain, desktop }) {
    debug("generateAndLaunchWithExplicitAuth", { storeFrontUrl, username, password, domain, desktop })
    tmp.tmpName({ postfix: ".ica" }, (tmpNameError, filename) => {
      if (tmpNameError) return console.error(tmpNameError)
      const args = [
        "-sfurl",
        `"${storeFrontUrl}"`,
        "-icapath",
        `"${filename}"`,
        "-username",
        `"${username}"`,
        "-password",
        `"${password}"`,
        "-domain",
        `"${domain}"`,
        "-desktop",
        `"${desktop}"`,
      ]
      debug("args", args)
      this.powershell.run(path.join(__dirname, "../scripts/generate-and-launch-with-explicit-auth.ps1"), args, (error, output) => {
        if (error) {
          return console.error(error)
        }
        debug("GENERATED", { filename })
        debug("output", output)
      })
    })
  }

  generateAndLaunchWithGatewayAuth({ storeFrontUrl, domain, desktop }) {
    debug("generateAndLaunchWithGatewayAuth", { storeFrontUrl, domain, desktop })
    tmp.tmpName({ postfix: ".ica" }, (tmpNameError, filename) => {
      if (tmpNameError) return console.error(tmpNameError)
      const args = ["-sfurl", `"${storeFrontUrl}"`, "-icapath", `"${filename}"`, "-domain", `"${domain}"`, "-desktop", `"${desktop}"`]
      debug("args", args)
      this.powershell.run(path.join(__dirname, "../scripts/generate-and-launch-with-gateway-auth.ps1"), args, (error, output) => {
        if (error) {
          return console.error(error)
        }
        debug("GENERATED", { filename })
        debug("output", output)
      })
    })
  }
}

module.exports = Connector
