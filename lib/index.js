'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var path = require('path');
var crypto = require('crypto');
var mailer = require('nodemailer');
var interpolate = require('interpolate');
var JWT = require('jsonwebtoken');

function sendMail(config, mail) {
  if (!config.email) {
    config.email = mailer.createTransport({
      port: 1025,
      ignoreTLS: true
    });
  } else if (!config.email.sendMail) {
    config.email = mailer.createTransport(config.mail);
  }
  return new Promise(function (resolve, reject) {
    return config.email.sendMail(mail, function (error, data) {
      if (error) return reject(error);else return resolve(data);
    });
  });
}

var actions = {
  login: function login(context, config) {
    context.referer = context.request.headers.referer;
    context.callback = path.join(context.host, context.path) + '?fn-auth=request';
  },
  request: function request(context, config) {
    var code = JWT.sign(context.params, config.request, config.session);
    var query = '?fn-auth=verify&fn-verify=' + code;
    var email = (context.params.email || '').trim();

    context.referer = context.params.referer;
    context.callback = [context.host, context.path, query].join('');
    context.from = config.from || ['noreply', context.domain].join('@');

    if (!email) return Promise.reject(new Error('No email provided'));
    if (email.indexOf('@') < 0) return Promise.reject(new Error('Invalid email'));

    return context.template('email', context).then(function (html) {
      return sendMail(config, {
        to: context.params.email,
        from: context.from,
        subject: config.text.email.subject,
        html: html
      });
    });
  },
  verify: function verify(context, config) {
    var data = JWT.verify(context.params['fn-verify'], config.request);
    context.referer = data.referer;
    return Object.assign(data, {
      token: JWT.sign({ email: data.email }, config.secret, config.session)
    });
  }
};

function defaults() {
  for (var _len = arguments.length, objects = Array(_len), _key = 0; _key < _len; _key++) {
    objects[_key] = arguments[_key];
  }

  return Object.assign.apply(Object, [objects[0] || {}].concat(_toConsumableArray(objects.reverse())));
}

module.exports = function setup() {
  var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  if (!config.text) config.text = {};
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
      error: path.join(__dirname, 'templates', 'error.html'),
      email: path.join(__dirname, 'templates', 'email.html'),
      login: path.join(__dirname, 'templates', 'login.html'),
      request: path.join(__dirname, 'templates', 'request.html'),
      verify: path.join(__dirname, 'templates', 'verify.html')
    })
  });

  return function auth(request, response, next) {
    var protocol = request.connection.encrypted ? 'https' : 'http';
    var params = Object.assign({}, request.query, request.body, request.params);
    var action = params['fn-auth'];
    var context = { params: params, action: action };

    if (params.token) {
      try {
        request.fnAuth = JWT.verify(params.token, config.secret);
      } catch (error) {
        delete request.params.token;
        delete request.query.token;
        delete request.body.token;
        delete params.token;
      }
    }

    context.config = config;
    context.request = request;
    context.response = response || request.res;
    context.template = template;
    context.protocol = config.protocol || protocol;
    context.domain = config.domain || request.headers.host;
    context.host = context.protocol + '://' + context.domain;
    context.path = (request.originalUrl || request.url || '?').split('?')[0];

    if (!actions[action]) return next();

    function template(action, data) {
      return new Promise(function (resolve, reject) {
        function callback(error, html) {
          if (error) return reject(error);
          return resolve(interpolate(html.toString(), data));
        }
        if (response.render && config.template[action].indexOf('.html') < 0) {
          response.render(config.template[action], data, callback);
        } else {
          fs.readFile(config.template[action], callback);
        }
      });
    }

    function render(status, _ref) {
      var _ref2 = _slicedToArray(_ref, 2);

      var action = _ref2[0];
      var data = _ref2[1];

      return template(action, data).then(function (html) {
        response.writeHead(status, { 'Content-Type': 'text/html' });
        response.end(html);
      });
    }
    function success(data) {
      return render(200, [action, Object.assign(context, { data: data })]);
    }
    function error(error) {
      console.error(error.stack);
      return render(401, ['error', Object.assign(context, { error: error })]);
    }
    Promise.resolve().then(function (done) {
      return actions[action](context, config);
    }).then(success).catch(error).catch(next);
  };
};