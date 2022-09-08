/* Code to check if the object or function is native JS
 * Author: John-David Dalton
 */
(function() {

  // Used to resolve the internal `[[Class]]` of values
  let toString = Object.prototype.toString;

  // Used to resolve the decompiled source of functions
  let fnToString = Function.prototype.toString;

  // Used to detect host constructors (Safari > 4; really typed array specific)
  let reHostCtor = /^\[object .+?Constructor\]$/;

  // Compile a regexp using a common native method as a template.
  // We chose `Object#toString` because there's a good chance it is not being mucked with.
  let reNative = RegExp('^' +
    // Coerce `Object#toString` to a string
    String(toString)
    // Escape any special regexp characters
      .replace(/[.*+?^${}()|[\]\/\\]/g, '\\$&')
    // Replace mentions of `toString` with `.*?` to keep the template generic.
    // Replace thing like `for ...` to support environments like Rhino which add extra info
    // such as method arity.
      .replace(/toString|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
  );

  function isNative(value) {
    let type = typeof value;
    return type == 'function'
      // Use `Function#toString` to bypass the value's own `toString` method
      // and avoid being faked out.
      ? reNative.test(fnToString.call(value))
      // Fallback to a host object check because some environments will represent
      // things like typed arrays as DOM methods which may not conform to the
      // normal native pattern.
      : (value && type == 'object' && reHostCtor.test(toString.call(value))) || false;
  }

  // export however you want
  module.exports = isNative;
}());
