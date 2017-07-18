const debug = require('debug')('meshblu-connector-storefront-ica:Powershell')
const fs = require('fs')
const bindAll = require('lodash/fp/bindAll')
const path = require('path')
const tmp = require('tmp')

tmp.setGracefulCleanup()
const POWERSHELL_PATH = path.join(process.env.SystemRoot, 'syswow64/WindowsPowerShell/v1.0/powershell.exe')
const SCRIPT_CACHE = {}

class Powershell {
  constructor({ child_process }) {
    bindAll(Object.getOwnPropertyNames(Powershell.prototype), this)
    this.child_process = child_process // eslint-disable-line camelcase
  }

  run(scriptPath, args, callback) {
    this._execFile(scriptPath, args, (error, stdout, stderr) => {
      if (error) return callback(error)
      if (stderr) debug(scriptPath, 'stderr', stderr)

      return this._parseJSON(stdout, callback)
    })
  }

  _convertScriptPath(scriptPath, callback) {
    if (SCRIPT_CACHE[scriptPath]) return callback(null, SCRIPT_CACHE[scriptPath])

    fs.readFile(scriptPath, 'utf8', (readFileError, script) => {
      if (readFileError) return callback(script)

      tmp.tmpName({ postfix: '.ps1' }, (tmpNameError, filename) => {
        if (tmpNameError) return callback(tmpNameError)

        fs.writeFile(filename, script, 'utf8', (writeFileError) => {
          if (writeFileError) return callback(writeFileError)

          SCRIPT_CACHE[scriptPath] = filename
          return callback(null, filename)
        })
      })
    })
  }

  _execFile(scriptPath, args, callback) {
    this._convertScriptPath(scriptPath, (error, convertedScriptPath) => {
      if (error) return callback(error)

      this.child_process.execFile(POWERSHELL_PATH, [convertedScriptPath, ...args], callback)
    })
  }

  _parseJSON(output, callback) {
    try {
      return callback(null, JSON.parse(output))
    } catch (error) {
      return callback(error)
    }
  }
}

module.exports = Powershell
