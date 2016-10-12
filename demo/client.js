var auth = require('../src/client')

var button = Object.assign(document.createElement('button'), {
  textContent: 'open', onclick() {
    auth('login').then(console.log.bind(console))
  }
})

document.body.appendChild(button)
