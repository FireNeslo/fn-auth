const path = require('path')
const crypto = require('crypto')
const mailer = require('nodemailer')
const interpolate = require('interpolate')
const JWT = require('jsonwebtoken')
const fs = require('fs')

function sendMail(config, mail) {
  if(!config.email) {
    config.email = mailer.createTransport({
      port: 1025,
      ignoreTLS: true,
    })
  } else if(!config.email.sendMail) {
    config.email = mailer.createTransport(config.mail)
  }
  return new Promise((resolve, reject) => {
    return config.email.sendMail(mail, (error, data) => {
      if(error) return reject(error)
      else return resolve(data)
    })
  })
}


const actions = {
  login(context, config) {
    context.referer = context.request.headers.referer
    context.callback = `${path.join(context.host,context.path)}?fn-auth=request`
  },
  request(context, config) {
    const code = JWT.sign(context.params, config.request, config.session)
    const query = `?fn-auth=verify&fn-verify=${code}`
    const email = (context.params.email || '').trim()

    context.referer = context.params.referer
    context.callback = [context.host, context.path, query].join('')
    context.from = config.from || ['noreply', context.domain].join('@')

    if(!email) return Promise.reject(new Error('No email provided'))
    if(email.indexOf('@') < 0) return Promise.reject(new Error('Invalid email'))

    return context.template('email', context).then(html => {
      return sendMail(config, {
        to: context.params.email,
        from: context.from,
        subject: config.text.email.subject,
        html: html
      })
    })
  },
  verify(context, config) {
    const data  = JWT.verify(context.params['fn-verify'], config.request)
    context.referer = data.referer
    return Object.assign(data, {
      token: JWT.sign({email: data.email}, config.secret, config.session)
    })
  }
}

function defaults(...objects) {
  return Object.assign(objects[0] || {}, ...objects.reverse())
}


module.exports = function setup(config={}) {
  if(!config.text) config.text = {}
  defaults(config, {
    session: defaults(config.session, {
      expiresIn: '1h'
    }),
    request: crypto.randomBytes(64).toString('hex'),
    refresh: crypto.randomBytes(64).toString('hex'),
    secret: crypto.randomBytes(64).toString('hex'),
    text: defaults(config.text, {
      email: defaults(config.text.email, {
        subject: 'Please confirm your email',
        intro: 'Click ',
        link: 'here',
        outro: 'To confirm.'
      }),
      login: defaults(config.text.login, {
        title: 'Login',
        email: 'Email',
        login: 'Login',
        reset: 'Forgot password'
      }),
      request: defaults(config.text.request, {
        title: 'Logon',
        pending: 'Waiting for confirmation'
      }),
      verify: defaults(config.text.verify, {
        title: 'Success'
      }),
      error: defaults(config.text.error, {
        title: 'Error'
      })
    }),
    template: defaults(config.template, {
      error: path.resolve(__dirname, '../src/templates', 'error.html'),
      email: path.resolve(__dirname, '../src/templates', 'email.html'),
      login: path.resolve(__dirname, '../src/templates', 'login.html'),
      request: path.resolve(__dirname, '../src/templates', 'request.html'),
      verify: path.resolve(__dirname, '../src/templates', 'verify.html')
    })
  })

  return function auth(request, response, next) {
    var protocol = request.connection.encrypted ? 'https' : 'http'
    var params = Object.assign({}, request.query, request.body, request.params)
    var action = params['fn-auth']
    var context = { params, action }

    if(params.token) {
      try {
        request.fnAuth = JWT.verify(params.token, config.secret)
      } catch(error) {
        delete request.params.token
        delete request.query.token
        delete request.body.token
        delete params.token
      }
    }

    context.config = config
    context.request = request
    context.response = response || request.res
    context.template = template
    context.protocol = config.protocol || protocol
    context.domain = config.domain || request.headers.host
    context.host = `${context.protocol}://${context.domain}`
    context.path = (request.originalUrl || request.url || '?').split('?')[0]

    if(!actions[action]) return next()

    function template(action, data) {
      return new Promise((resolve, reject) => {
        function callback(error, html) {
          if(error) return reject(error)
          return resolve(interpolate(html.toString(), data))
        }
        if(response.render && config.template[action].indexOf('.html') < 0) {
          response.render(config.template[action], data, callback)
        } else {
          fs.readFile(config.template[action], callback)
        }
      })
    }

    function render(status, [action, data]) {
      return template(action, data).then(html => {
        response.writeHead(status, {'Content-Type': 'text/html'})
        response.end(html)
      })
    }
    function success(data) {
      debugger
      return render(200, [action, Object.assign(context, {data})])
    }
    function error(error) {
      debugger
      return render(401, ['error', Object.assign(context, {error})])
    }
    Promise.resolve()
      .then(done => actions[action](context, config))
      .then(success).catch(error).catch(next)
  }
}
