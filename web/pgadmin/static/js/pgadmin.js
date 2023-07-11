/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([], function() {
  let pgAdmin = window.pgAdmin = window.pgAdmin || {};

  // Reference:
  // https://github.com/heygrady/Units/blob/master/Length.min.js
  // Changed it to save the function in pgAdmin object.
  (function(t, e, o) {
    'use strict';

    function r(_t, _e, _r, _p) {
      _r = _r || 'width';
      let _n, _l, _m, _c = (_e.match(s) || [])[2],
        _f = 'px' === _c ? 1 : d[_c + 'toPx'],
        _u = /r?em/i;
      if (_f || _u.test(_c) && !_p){
        if ('rem' === _c) {
          _t = i;
        }
        _t = 'fontSize' === _r ? +t.parentNode || _t : _t;
        _f = _f || parseFloat(a(_t, 'fontSize'));
        _m = parseFloat(_e) * _f;
      }
      else {
        _n = _t.style;
        _l = _n[_r];
        try {
          _n[_r] = _e;
        } catch (x) {
          return 0;
        }
        _m = _n[_r] ? parseFloat(a(_t, _r)) : 0;
        _n[_r] = _l !== o ? _l : null;
      }
      return _m;
    }

    function a(_t, _e) {
      let _o, _n, _i, _l, _d, _c = /^(top|bottom)/,
        _f = ['paddingTop', 'paddingBottom', 'borderTop', 'borderBottom'],
        _u = 4;

      _n = _t.style['pixel' + _e.charAt(0).toUpperCase() + _e.slice(1)];
      if (m) {
        _o = m(_t)[_e];
      } else {
        if (_n) {
          _o = _n + 'px'; 
        } else {
          _o = 'fontSize' === _e ? r(_t, '1em', 'left', 1) + 'px' : _t.currentStyle[_e];
        }
      }
      _i = (_o.match(s) || [])[2];

      if ('%' === _i && p)
        if (_c.test(_e)) {
          for (_l = (_d = _t.parentNode || _t).offsetHeight; _u--;) _l -= parseFloat(a(_d, _f[_u]));
          _o = parseFloat(_o) / 100 * _l + 'px';
        } else _o = r(_t, _o);
      else('auto' === _o || _i && 'px' !== _i) && m ? _o = 0 : _i && 'px' !== _i && !m && (_o = r(_t, _o) + 'px');
      return _o;
    }
    let p, n = e.createElement('test'),
      i = e.documentElement,
      l = e.defaultView,
      m = l && l.getComputedStyle,
      s = /^(-?[\d+\.\-]+)([a-z]+|%)$/i,
      d = {},
      c = [1 / 25.4, 1 / 2.54, 1 / 72, 1 / 6],
      f = ['mm', 'cm', 'pt', 'pc', 'in', 'mozmm'],
      u = 6;
    for (i.appendChild(n), m && ((n.style.marginTop = '1%'), (p = '1%' === m(n).marginTop)); u--;) d[f[u] + 'toPx'] = c[u] ? c[u] * d.inToPx : r(n, '1' + f[u]);
    i.removeChild(n); t.toPx = r;
  })(pgAdmin, window.document);

  // Reference:
  // https://github.com/javve/natural-sort/blob/master/index.js
  // Changed it to save the function in pgAdmin object.
  pgAdmin.natural_sort = function(a, b, options) {
    options = options || {};

    let re = /(^-?\d+(\.?\d*)[df]?e?\d?$|^0x[0-9a-f]+$|\d+)/gi,
      sre = /(^[ ]*|[ ]*$)/g,
      dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/,
      hre = /^0x[0-9a-f]+$/i,
      ore = /^0/,
      i = function(s) {
        return options.insensitive && ('' + s).toLowerCase() || '' + s;
      },
      // convert all to strings strip whitespace
      x = i(a).replace(sre, '') || '',
      y = i(b).replace(sre, '') || '',
      // chunk/tokenize
      xN = x.replace(re, '\0$1\0').replace(/\0$/, '').replace(/^\0/, '').split('\0'),
      yN = y.replace(re, '\0$1\0').replace(/\0$/, '').replace(/^\0/, '').split('\0'),
      // numeric, hex or date detection
      xD = parseInt(x.match(hre)) || (xN.length !== 1 && x.match(dre) && Date.parse(x)),
      yD = parseInt(y.match(hre)) || xD && y.match(dre) && Date.parse(y) || null,
      oFxNcL, oFyNcL,
      mult = options.desc ? -1 : 1;

    // first try and sort Hex codes or Dates
    if (yD)
      if (xD < yD) return -1 * mult;
      else if (xD > yD) return 1 * mult;

    // natural sorting through split numeric strings and default strings
    for (let cLoc = 0, numS = Math.max(xN.length, yN.length); cLoc < numS; cLoc++) {
      // find floats not starting with '0', string or 0 if not defined (Clint Priest)
      oFxNcL = !(xN[cLoc] || '').match(ore) && parseFloat(xN[cLoc]) || xN[cLoc] || 0;
      oFyNcL = !(yN[cLoc] || '').match(ore) && parseFloat(yN[cLoc]) || yN[cLoc] || 0;
      // handle numeric vs string comparison - number < string - (Kyle Adams)
      if (isNaN(oFxNcL) !== isNaN(oFyNcL)) {
        return (isNaN(oFxNcL) ? 1 : -1) * mult;
      }
      // rely on string comparison if different types - i.e. '02' < 2 != '02' < '2'
      else if (typeof oFxNcL !== typeof oFyNcL) {
        oFxNcL += '';
        oFyNcL += '';
      }
      if (oFxNcL < oFyNcL) return -1 * mult;
      if (oFxNcL > oFyNcL) return 1 * mult;
    }
    return 0;
  };

  pgAdmin.numeric_comparator = function(a, b) {
    a = parseInt(a);
    b = parseInt(b);
    if (a < b)
      return -1;
    else if (a == b)
      return 0;
    else
      return 1;
  };

  /**
   * Decimal adjustment of a number.
   *
   * @param {String}  type  The type of adjustment.
   * @param {Number}  value The number.
   * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
   * @returns {Number} The adjusted value.
   */
  function decimalAdjust(type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
      return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || exp % 1 !== 0) {
      return NaN;
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
  }

  // Decimal round
  if (!Math.round10) {
    Math.round10 = function(value, exp) {
      return decimalAdjust('round', value, exp);
    };
  }
  // Decimal floor
  if (!Math.floor10) {
    Math.floor10 = function(value, exp) {
      return decimalAdjust('floor', value, exp);
    };
  }
  // Decimal ceil
  if (!Math.ceil10) {
    Math.ceil10 = function(value, exp) {
      return decimalAdjust('ceil', value, exp);
    };
  }

  pgAdmin.ui = {dialogs: {}};

  return pgAdmin;
});
