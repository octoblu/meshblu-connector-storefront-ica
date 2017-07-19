const request = require("request")
const bindAll = require("lodash/fp/bindAll")

class StoreFrontService {
  constructor({ storeFrontUrl }) {
    bindAll(Object.getOwnPropertyNames(StoreFrontService.prototype), this)
    if (!storeFrontUrl) throw new Error('StoreFrontService: requires storeFrontUrl')
    this.storeFrontUrl = storeFrontUrl
    const jar = request.jar()
    request.defaults({ jar })
  }

  generateICA(callback) {
    this.loadMainPage((error) => {
      if (error) return callback(error)
      callback(null, 'hello')
    })
  }

  loadMainPage(callback) {
    const options = {
      baseUrl: this.storeFrontUrl,
      uri: "/",
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
      }
    }
    request.get(options, (error, response) => {
      if (error) return callback(error)
      if (response.statusCode > 399) {
        return callback(new Error(`Unexpected status code (${response.statusCode}) when loading main page`))
      }
      callback()
    })
  }
}

module.exports = StoreFrontService
