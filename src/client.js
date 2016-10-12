module.exports = auth
module.exports.modal = modal
module.exports.auth = auth

function yesno(option) {
  return typeof option === 'boolean' ? option ? 'yes' : 'no' : option
}
function optionValue(option) {
  return [option, yesno(this[option])].filter(v => v != null).join('=')
}
function optionValues(options) {
  return Object.keys(options).map(optionValue, options).join(',')
}
const modalDefaults = {
  width: 250,
  height: 250,
  status: true,
  resizable: true,
  scrollbars: true
}

function assignParam(object, [key, value]) {
  return object[key] = value, object
}
function parseSearch(search) {
  return Array.from(new URLSearchParams(search)).reduce(assignParam, {})
}

function modal(url, data={}, options={}) {
  options = Object.assign({}, options, modalDefaults)
  return new Promise((resolve, reject) => {
    const popup = window.open(url, null, optionValues(options))
    requestAnimationFrame(function poll() {
      if(popup.closed) return reject(new Error('Window was closed.'))
      try {
        const sameHost = popup.location.host === location.host
        const sameProtocol = popup.location.protocol === location.protocol
        const samePath = popup.location.pathname === location.pathname
        if(sameProtocol && sameHost && samePath) {
          resolve(parseSearch(popup.location.search.slice(1)))
          popup.close()
        }
      } finally {
        requestAnimationFrame(poll)
      }
    })
  })
}

function auth(step, data) {
  return modal(`/auth?fn-auth=${step}`)
}
