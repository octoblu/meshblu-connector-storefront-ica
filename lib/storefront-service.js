const series = require('async/series')
const request = require("request")
const bindAll = require("lodash/fp/bindAll")
const find = require("lodash/fp/find")
const get = require("lodash/fp/get")

class StoreFrontService {
  constructor({ storeFrontUrl, desktop, domain, username, password }) {
    bindAll(Object.getOwnPropertyNames(StoreFrontService.prototype), this)
    if (!storeFrontUrl) throw new Error('StoreFrontService: requires storeFrontUrl')
    if (!domain) throw new Error('StoreFrontService: requires domain')
    if (!desktop) throw new Error('StoreFrontService: requires desktop')
    this.username = username
    this.password = password
    this.domain = domain
    this.desktop = desktop
    this.storeFrontUrl = storeFrontUrl
    this.jar = request.jar()
  }

  explicitLogin(callback) {
    const csrfToken = this.getCookie('Csrf-Token', 'value')
    const options = {
      baseUrl: this.storeFrontUrl,
      uri: "ExplicitAuth/Login",
      headers: {
        'Accept': 'application/xml, text/xml, */*; q=0.01',
        'X-Citrix-IsUsingHTTPS': "Yes",
        'Content-Length': '0',
        'Csrf-Token': csrfToken,
      },
      jar: this.jar,
    }
    request.post(options, (error, response) => {
      if (error) return callback(error)
      if (response.statusCode > 399) {
        return callback(new Error(`Unexpected status code (${response.statusCode}) when ExplicitAuth/Login`))
      }
      callback()
    })
  }

  explicitLoginAttempt(callback) {
    const options = {
      baseUrl: this.storeFrontUrl,
      uri: "ExplicitAuth/LoginAttempt",
      headers: {
        'Accept': 'application/xml, text/xml, */*; q=0.01',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.8',
        'X-Requested-With': 'XMLHttpRequest',
      },
      json: {
        domain: 'some-domain',
        loginBtn: 'Log On',
        password: 'some-password',
        saveCredentials: "false",
        username: 'some-username',
        StateContext: '',
      },
      jar: this.jar,
    }
    request.post(options, (error, response) => {
      if (error) return callback(error)
      if (response.statusCode > 399) {
        return callback(new Error(`Unexpected status code (${response.statusCode}) when ExplicitAuth/Login`))
      }
      callback()
    })
  }

  generateICA(callback) {
    series({
      loadMainPage: this.loadMainPage,
      homeConfiguration: this.homeConfiguration,
      checkResources: this.listResources,
      getAuthMethods: this.getAuthMethods,
      setStoreFrontCookies: this.setStoreFrontCookies,
      explicitLogin: this.explicitLogin,
      explicitLoginAttempt: this.explicitLoginAttempt,
      listResources: this.listResources,
    }, (error, result) => {
      if (error) return callback(error)
      const { listResources } = result
      const resources = get('resources')(listResources)
      const foundResource = find({ name: this.desktop, type: 'Citrix.MPS.Desktop' })(resources)
      if (!foundResource) {
        return callback(new Error('Unable to find resource'))
      }
      this.getICAFileContents(foundResource, callback)
    })
  }

  getAuthMethods(callback) {
    const csrfToken = this.getCookie('Csrf-Token', 'value')
    const options = {
      baseUrl: this.storeFrontUrl,
      uri: "Authentication/GetAuthMethods",
      headers: {
        'Accept': 'application/xml, text/xml, */*; q=0.01',
        'X-Citrix-IsUsingHTTPS': "Yes",
        'Content-Length': '0',
        'Csrf-Token': csrfToken,
        'Referer': this.storeFrontUrl,
      },
      jar: this.jar,
    }
    request.post(options, (error, response) => {
      if (error) return callback(error)
      if (response.statusCode > 399) {
        return callback(new Error(`Unexpected status code (${response.statusCode}) when fetching Authentication/GetAuthMethods`))
      }
      callback()
    })
  }

  getCookies() {
    return this.jar.getCookies(this.storeFrontUrl)
  }

  getCookie(key, property) {
    const findByKey = find({ key })
    const getProp = get(property)
    return getProp(findByKey(this.getCookies()))
  }

  getICAFileContents(resource, callback) {
    if (!resource.launchurl) {
      return callback(new Error('Resource missing launchurl'))
    }
    const csrfToken = this.getCookie('Csrf-Token', 'value')
    const options = {
      uri: resource.launchurl,
      qs: {
        CsrfToken: csrfToken,
        IsUsingHttps: 'Yes',
      }
    }
    request.get(options, (error, response, contents) => {
      if (error) return callback(error)
      if (response.statusCode > 399) {
        return callback(new Error(`Unexpected status code (${response.statusCode}) when fetching ICA File`))
      }
      callback(null, contents)
    })
  }

  homeConfiguration(callback) {
    const options = {
      baseUrl: this.storeFrontUrl,
      uri: "Home/Configuration",
      headers: {
        Accept: 'application/xml, text/xml, */*; q=0.01',
        'Content-Length': 0,
        'X-Requested-With': 'XMLHttpRequest',
        'X-Citrix-IsUsingHTTPS': 'Yes',
        'Referer': this.storeFrontUrl,
      },
      jar: this.jar,
    }
    request.post(options, (error, response) => {
      if (error) return callback(error)
      if (response.statusCode > 399) {
        return callback(new Error(`Unexpected status code (${response.statusCode}) when fetching Home/Configuration`))
      }
      callback()
    })
  }

  listResources(callback) {
    const csrfToken = this.getCookie('Csrf-Token', 'value')
    const options = {
      baseUrl: this.storeFrontUrl,
      uri: "Resources/List",
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Citrix-IsUsingHTTPS': "Yes",
        'Csrf-Token': csrfToken,
        'format': 'json&resourceDetails=Full',
        'Referer': this.storeFrontUrl,
      },
      form: {
        format: 'json',
        resourceDetails: 'Full',
      },
      jar: this.jar,
    }
    request.post(options, (error, response, body) => {
      if (error) return callback(error)
      if (response.statusCode > 399) {
        return callback(new Error(`Unexpected status code (${response.statusCode}) when fetching Resources/List`))
      }
      try {
        callback(null, JSON.parse(body))
      } catch (error) {
        return callback(null)
      }
    })
  }

  loadMainPage(callback) {
    const options = {
      baseUrl: this.storeFrontUrl,
      uri: "/",
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
      },
      jar: this.jar,
    }
    request.get(options, (error, response) => {
      if (error) return callback(error)
      if (response.statusCode > 399) {
        return callback(new Error(`Unexpected status code (${response.statusCode}) when loading /`))
      }
      callback()
    })
  }

  setStoreFrontCookies(callback) {
    this.setCookie('CtxsUserPreferredClient', 'Native')
    this.setCookie('CtxsClientDetectionDon', 'true')
    this.setCookie('CtxsHasUpgradeBeenShown', 'true')
    callback()
  }

  setCookie(key, value) {
    const domain = this.getCookie('Csrf-Token', 'domain')
    const cookie = request.cookie(`${key}=${value}; Domain=${domain}`)
    this.jar.setCookie(cookie, this.storeFrontUrl, {ignoreError: true})
  }
}

module.exports = StoreFrontService
