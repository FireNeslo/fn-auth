

fn-auth - v1.0.0
===
A very simple auth module.

Check demo/index.js for usage
## Install
### npm
```bash
$ npm install FireNeslo/fn-auth --save
```
## Usage
#### server:
```js
const express = require('express')
const body = require('body-parser')
const auth = require('fn-auth')

const app = express()
  .use(body.json())
  .use(body.urlencoded())
  .use('/auth', auth())
  .use('/', express.static('public'))
  .listen(8080)

```
#### client:
```js
const auth = require('fn-auth/client')

auth('login').then(data => {
  console.log(data.token)
})
```

## API

### Server

#### auth(config)

Author: fireneslo@gmail.com

##### Params:

* **object** *config* - Configure templates translations and settings

```js
/* defaults */
export const config = {
  session: { expiresIn: '1h' },
  request: crypto.randomBytes(64).toString('hex'),
  secret: crypto.randomBytes(64).toString('hex'),
  text: {
    email: {
      subject: 'Please confirm your email',
      intro: 'Click ',
      link: 'here',
      outro: 'To confirm.'
    },
    login: {
      title: 'Login',
      email: 'Email',
      login: 'Login',
      reset: 'Forgot password'
    },
    request: {
      title: 'Logon',
      pending: 'Waiting for confirmation'
    },
    verify: {
      title: 'Success'
    },
    error: {
      title: 'Error'
    }
  },
  template: {
    error: 'fn-auth/src/templates/error.html',
    email: 'fn-auth/src/templates/email.html',
    login: 'fn-auth/src/templates/login.html',
    request: 'fn-auth/src/templates/request.html',
    verify: 'fn-auth/src/templates/verify.html'
  }
}
```

### Client

#### auth(step, root)

Author: fireneslo@gmail.com

##### Params:

* **string** *step* - action you want to perform default 'login'
* **string** *root* - url to your server endpoint default '/auth'

```js
auth('login', '/auth').then(data => {
  console.log(data.token)
})
´´´
