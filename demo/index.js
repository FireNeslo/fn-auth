const fs = require('fs')
const path = require('path')

const budo = require('budo')
const MailDev = require('maildev' )
const query = require('qs-middleware')
const body = require('body-parser')
const auth = require('../src')

function route(url, handler) {
  return function(req, res, next) {
    if(~req.url.indexOf(url)) {
      handler(req, res, next)
    } else {
      next()
    }
  }
}

const mailServer = new MailDev().listen();
const app = budo(path.join(__dirname, 'client.js'), {
  debug: true,
  stream: process.stdout,
  middleware: [
    query(),
    body.json(),
    body.urlencoded(),
    route('/auth', auth({}))
  ]
})
