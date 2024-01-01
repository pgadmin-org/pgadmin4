/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* Ref: https://github.com/heygrady/Units/blob/master/Length.js */

let testElem = document.createElement('test'),
  docElement = document.documentElement,
  defaultView = document.defaultView,
  getComputedStyle = defaultView?.getComputedStyle,
  computedValueBug,
  runit = /^(-?[\d+\.\-]+)([a-z]+|%)$/i,
  convert = {},
  conversions = [1 / 25.4, 1 / 2.54, 1 / 72, 1 / 6],
  units = ['mm', 'cm', 'pt', 'pc', 'in', 'mozmm'],
  i = 6; // units.length

// add the test element to the dom
docElement.appendChild(testElem);

// test for the WebKit getComputedStyle bug
// @see http://bugs.jquery.com/ticket/10639
if (getComputedStyle) {
  // add a percentage margin and measure it
  testElem.style.marginTop = '1%';
  computedValueBug = getComputedStyle(testElem).marginTop === '1%';
}

// pre-calculate absolute unit conversions
while (i--) {
  convert[units[i] + 'toPx'] = conversions[i] ? conversions[i] * convert.inToPx : toPx('1' + units[i], null, false, testElem);
}

// remove the test element from the DOM and delete it
docElement.removeChild(testElem);
testElem = undefined;

// convert a value to pixels
export default function toPx(value, prop, force, el) {
  let elem = document.createElement('div');
  if(el) {
    elem = el;
  } else {
    elem = document.createElement('div');
    document.body.appendChild(elem);
  }

  // use width as the default property, or specify your own
  prop = prop || 'width';

  var style,
    inlineValue,
    ret,
    unit = (value.match(runit) || [])[2],
    conversion = unit === 'px' ? 1 : convert[unit + 'toPx'],
    rem = /r?em/i;

  if (conversion || rem.test(unit) && !force) {
    // calculate known conversions immediately
    // find the correct element for absolute units or rem or fontSize + em or em
    elem = conversion ? elem : unit === 'rem' ? docElement : prop === 'fontSize' ? elem.parentNode || elem : elem;

    // use the pre-calculated conversion or fontSize of the element for rem and em
    conversion = conversion || parseFloat(curCSS(elem, 'fontSize'));

    // multiply the value by the conversion
    ret = parseFloat(value) * conversion;
  } else {
    // begin "the awesome hack by Dean Edwards"
    // @see http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291

    // remember the current style
    style = elem.style;
    inlineValue = style[prop];

    // set the style on the target element
    try {
      style[prop] = value;
    } catch (e) {
      // IE 8 and below throw an exception when setting unsupported units
      return 0;
    }

    // read the computed value
    // if style is nothing we probably set an unsupported unit
    ret = !style[prop] ? 0 : parseFloat(curCSS(elem, prop));

    // reset the style back to what it was or blank it out
    style[prop] = inlineValue !== undefined ? inlineValue : null;
  }

  // return a number
  if(!el) document.body.removeChild(elem);
  return ret;
}

// return the computed value of a CSS property
function curCSS(elem, prop) {
  var value,
    pixel,
    unit,
    rvpos = /^(top|bottom)/,
    outerProp = ['paddingTop', 'paddingBottom', 'borderTop', 'borderBottom'],
    innerHeight,
    parent,
    i = 4; // outerProp.length

  if (getComputedStyle) {
    // FireFox, Chrome/Safari, Opera and IE9+
    value = getComputedStyle(elem)[prop];
  } else if (pixel == elem.style['pixel' + prop.charAt(0).toUpperCase() + prop.slice(1)]) {
    // IE and Opera support pixel shortcuts for top, bottom, left, right, height, width
    // WebKit supports pixel shortcuts only when an absolute unit is used
    value = pixel + 'px';
  } else if (prop === 'fontSize') {
    // correct IE issues with font-size
    // @see http://bugs.jquery.com/ticket/760
    value = toPx(elem, '1em', 'left', 1) + 'px';
  } else {
    // IE 8 and below return the specified style
    value = elem.currentStyle[prop];
  }

  // check the unit
  unit = (value.match(runit) || [])[2];
  if (unit === '%' && computedValueBug) {
    // WebKit won't convert percentages for top, bottom, left, right, margin and text-indent
    if (rvpos.test(prop)) {
      // Top and bottom require measuring the innerHeight of the parent.
      innerHeight = (parent = elem.parentNode || elem).offsetHeight;
      while (i--) {
        innerHeight -= parseFloat(curCSS(parent, outerProp[i]));
      }
      value = parseFloat(value) / 100 * innerHeight + 'px';
    } else {
      // This fixes margin, left, right and text-indent
      // @see https://bugs.webkit.org/show_bug.cgi?id=29084
      // @see http://bugs.jquery.com/ticket/10639
      value = toPx(elem, value);
    }
  } else if ((value === 'auto' || (unit && unit !== 'px')) && getComputedStyle) {
    // WebKit and Opera will return auto in some cases
    // Firefox will pass back an unaltered value when it can't be set, like top on a static element
    value = 0;
  } else if (unit && unit !== 'px' && !getComputedStyle) {
    // IE 8 and below won't convert units for us
    // try to convert using a prop that will return pixels
    // this will be accurate for everything (except font-size and some percentages)
    value = toPx(elem, value) + 'px';
  }
  return value;
}
