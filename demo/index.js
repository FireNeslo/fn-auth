const fs = require('fs')
const path = require('path')

const connect = require('connect')
const MailDev = require('maildev' )
const query = require('qs-middleware')
const body = require('body-parser')
const auth = require('../src')



function file(name) {
  const filepath = path.join(__dirname, name)
  return function render(req, res) {
    fs.createReadStream(filepath).pipe(res)
  }
}


var mailServer = new MailDev().listen();
const users = []

const app = connect()
  .use(query())
  .use(body.json())
  .use(body.urlencoded())
  .use('/auth', auth({}))
  .use('/client.js', file('client.js'))
  .use(file('index.html'))
  .listen(9966)
