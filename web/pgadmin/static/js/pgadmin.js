/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([], function() {
  var pgAdmin = window.pgAdmin = window.pgAdmin || {};

  // Reference:
  // https://github.com/heygrady/Units/blob/master/Length.min.js
  // Changed it to save the function in pgAdmin object.
  (function(t, e, o) {
    'use strict';

    function r(t, e, r, p) {
      r = r || 'width';
      var n, l, m, c = (e.match(s) || [])[2],
        f = 'px' === c ? 1 : d[c + 'toPx'],
        u = /r?em/i;
      if (f || u.test(c) && !p) t = f ? t : 'rem' === c ? i : 'fontSize' === r ? t.parentNode || t : t, f = f || parseFloat(a(t, 'fontSize')), m = parseFloat(e) * f;
      else {
        n = t.style, l = n[r];
        try {
          n[r] = e;
        } catch (x) {
          return 0;
        }
        m = n[r] ? parseFloat(a(t, r)) : 0, n[r] = l !== o ? l : null;
      }
      return m;
    }

    function a(t, e) {
      var o, n, i, l, d, c = /^top|bottom/,
        f = ['paddingTop', 'paddingBottom', 'borderTop', 'borderBottom'],
        u = 4;

      n = t.style['pixel' + e.charAt(0).toUpperCase() + e.slice(1)];
      o = m ? m(t)[e] : (n) ? n + 'px' : 'fontSize' === e ? r(t, '1em', 'left', 1) + 'px' : t.currentStyle[e];
      i = (o.match(s) || [])[2];

      if ('%' === i && p)
        if (c.test(e)) {
          for (l = (d = t.parentNode || t).offsetHeight; u--;) l -= parseFloat(a(d, f[u]));
          o = parseFloat(o) / 100 * l + 'px';
        } else o = r(t, o);
      else('auto' === o || i && 'px' !== i) && m ? o = 0 : i && 'px' !== i && !m && (o = r(t, o) + 'px');
      return o;
    }
    var p, n = e.createElement('test'),
      i = e.documentElement,
      l = e.defaultView,
      m = l && l.getComputedStyle,
      s = /^(-?[\d+\.\-]+)([a-z]+|%)$/i,
      d = {},
      c = [1 / 25.4, 1 / 2.54, 1 / 72, 1 / 6],
      f = ['mm', 'cm', 'pt', 'pc', 'in', 'mozmm'],
      u = 6;
    for (i.appendChild(n), m && (n.style.marginTop = '1%', p = '1%' === m(n).marginTop); u--;) d[f[u] + 'toPx'] = c[u] ? c[u] * d.inToPx : r(n, '1' + f[u]);
    i.removeChild(n), n = o, t.toPx = r;
  })(pgAdmin, window.document);

  // Reference:
  // https://github.com/javve/natural-sort/blob/master/index.js
  // Changed it to save the function in pgAdmin object.
  pgAdmin.natural_sort = function(a, b, options) {
    options = options || {};

    var re = /(^-?[0-9]+(\.?[0-9]*)[df]?e?[0-9]?$|^0x[0-9a-f]+$|[0-9]+)/gi,
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
    for (var cLoc = 0, numS = Math.max(xN.length, yN.length); cLoc < numS; cLoc++) {
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
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
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

  return pgAdmin;
});
