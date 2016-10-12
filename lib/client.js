'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

module.exports = auth;
module.exports.modal = modal;
module.exports.auth = auth;

function yesno(option) {
  return typeof option === 'boolean' ? option ? 'yes' : 'no' : option;
}
function optionValue(option) {
  return [option, yesno(this[option])].filter(function (v) {
    return v != null;
  }).join('=');
}
function optionValues(options) {
  return Object.keys(options).map(optionValue, options).join(',');
}
var modalDefaults = {
  width: 250,
  height: 250,
  status: true,
  resizable: true,
  scrollbars: true
};

function assignParam(object, _ref) {
  var _ref2 = _slicedToArray(_ref, 2);

  var key = _ref2[0];
  var value = _ref2[1];

  return object[key] = value, object;
}
function parseSearch(search) {
  return Array.from(new URLSearchParams(search)).reduce(assignParam, {});
}

function modal(url) {
  var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  options = Object.assign({}, options, modalDefaults);
  return new Promise(function (resolve, reject) {
    var popup = window.open(url, null, optionValues(options));
    requestAnimationFrame(function poll() {
      if (popup.closed) return reject(new Error('Window was closed.'));
      try {
        var sameHost = popup.location.host === location.host;
        var sameProtocol = popup.location.protocol === location.protocol;
        var samePath = popup.location.pathname === location.pathname;
        if (sameProtocol && sameHost && samePath) {
          resolve(parseSearch(popup.location.search.slice(1)));
          popup.close();
        }
      } finally {
        requestAnimationFrame(poll);
      }
    });
  });
}

function auth(step, data) {
  return modal('/auth?fn-auth=' + step);
}
