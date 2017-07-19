const { describe, beforeEach, afterEach } = global
const { expect, it } = global
const shmock = require("@octoblu/shmock")
const enableDestroy = require("server-destroy")
const url = require("url")
const StoreFrontService = require('../lib/storefront-service')

describe('StoreFrontService', function() {
  beforeEach('setup', function () {
    this.storeFrontServer = shmock()
    enableDestroy(this.storeFrontServer)
    this.storeFrontUrl = url.format({
      hostname: 'localhost',
      pathname: 'Citrix/StoreWeb',
      port: this.storeFrontServer.address().port,
      protocol: 'http',
    })
    this.sut = new StoreFrontService({
      storeFrontUrl: this.storeFrontUrl,
    })
  })

  afterEach(function () {
    this.storeFrontServer.destroy()
  })

  describe('->generateICA', function() {
    beforeEach('generate-ica', function(done) {
      this.loadMainPage = this.storeFrontServer.get('/Citrix/StoreWeb')
        .set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8')
        .set('Upgrade-Insecure-Requests', '1')
        .reply(200)

      this.sut.generateICA((error, icaContents) => {
        if (error) {
          return done(error)
        }
        this.icaContents = icaContents
        done()
      })
    })
    it('should yeild ICA contents', function () {
      expect(this.icaContents).to.deep.equal('hello')
    })

    it('should call load main page', function () {
      this.loadMainPage.done()
    })
  })
})
