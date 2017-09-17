'use strict';

const _ = require('underscore');
var l_detailed_debug = false,
  l_show_debug = true,
  with_prefix = true,
  colors = {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Dim: "\x1b[2m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m",
    fg: {
      Black: "\x1b[30m",
      Red: "\x1b[31m",
      Green: "\x1b[32m",
      Yellow: "\x1b[33m",
      Blue: "\x1b[34m",
      Magenta: "\x1b[35m",
      Cyan: "\x1b[36m",
      White: "\x1b[37m",
      Crimson: "\x1b[38m"
    },
    bg: {
      Black: "\x1b[40m",
      Red: "\x1b[41m",
      Green: "\x1b[42m",
      Yellow: "\x1b[43m",
      Blue: "\x1b[44m",
      Magenta: "\x1b[45m",
      Cyan: "\x1b[46m",
      White: "\x1b[47m",
      Crimson: "\x1b[48m"
    }
  };

/*
Embedded the support-color...
Reference: https://github.com/chalk/supports-color

MIT License

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */
const os = require('os');
const hasFlag = require('has-flag');

const env = process.env;

const support = level => {
	if (level === 0) {
		return false;
	}

	return {
		level,
		hasBasic: true,
		has256: level >= 2,
		has16m: level >= 3
	};
};

let supportLevel = (() => {
	if (hasFlag('no-color') ||
		hasFlag('no-colors') ||
		hasFlag('color=false')) {
		return 0;
	}

	if (hasFlag('color=16m') ||
		hasFlag('color=full') ||
		hasFlag('color=truecolor')) {
		return 3;
	}

	if (hasFlag('color=256')) {
		return 2;
	}

	if (hasFlag('color') ||
		hasFlag('colors') ||
		hasFlag('color=true') ||
		hasFlag('color=always')) {
		return 1;
	}

	if (process.stdout && !process.stdout.isTTY) {
		return 0;
	}

	if (process.platform === 'win32') {
		// Node.js 7.5.0 is the first version of Node.js to include a patch to
		// libuv that enables 256 color output on Windows. Anything earlier and it
		// won't work. However, here we target Node.js 8 at minimum as it is an LTS
		// release, and Node.js 7 is not. Windows 10 build 10586 is the first Windows
		// release that supports 256 colors.
		const osRelease = os.release().split('.');
		if (
			Number(process.versions.node.split('.')[0]) >= 8 &&
			Number(osRelease[0]) >= 10 &&
			Number(osRelease[2]) >= 10586
		) {
			return 2;
		}

		return 1;
	}

	if ('CI' in env) {
		if (['TRAVIS', 'CIRCLECI', 'APPVEYOR', 'GITLAB_CI'].some(sign => sign in env)) {
			return 1;
		}

		return 0;
	}

	if ('TEAMCITY_VERSION' in env) {
		return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
	}

	if ('TERM_PROGRAM' in env) {
		const version = parseInt((env.TERM_PROGRAM_VERSION || '').split('.')[0], 10);

		switch (env.TERM_PROGRAM) {
			case 'iTerm.app':
				return version >= 3 ? 3 : 2;
			case 'Hyper':
				return 3;
			case 'Apple_Terminal':
				return 2;
			// No default
		}
	}

	if (/^(screen|xterm)-256(?:color)?/.test(env.TERM)) {
		return 2;
	}

	if (/^screen|^xterm|^vt100|color|ansi|cygwin|linux/i.test(env.TERM)) {
		return 1;
	}

	if ('COLORTERM' in env) {
		return 1;
	}

	if (env.TERM === 'dumb') {
		return 0;
	}

	return 0;
})();

if ('FORCE_COLOR' in env) {
	supportLevel = parseInt(env.FORCE_COLOR, 10) === 0 ? 0 : (supportLevel || 1);
}

const colorSupport = process && support(supportLevel);

if (!colorSupport) {
  _.each(colors, function(_value, _key) {
    if (!_.isObject(colors[_key])) {
      colors[_key] = '';
    }
  });

  _.each(colors.fg, function(_value, _key) {
      colors.fg[_key] = '';
  });

  _.each(colors.bg, function(_value, _key) {
      colors.bg[_key] = '';
  });
}

function beautify_message(_color, _prefix, _msg, _args) {
  if (with_prefix) {
    _args.unshift(_color + '[' + _prefix + ']: ' + colors.Reset + _msg);
  } else {
    _args.unshift(_color + _msg);
    _args.push(colors.Reset);
  }
  return _args;
}
/* END: supports-color */

module.exports = {
  detailed_debug: function(_show) {
    l_detailed_debug = !!_show;
  },
  show_debug: function(_show) {
    l_show_debug = !!_show;
  },
  show_prefix: function(_flag) {with_prefix = !!_flag},
  debug: function(_msg) {
    if (l_show_debug) {
      var args = Array.prototype.slice.call(arguments, 1);
      console.info.apply(
        undefined, beautify_message(
          colors.fg.Green, 'DEBUG', _msg, args
        )
      );
    }
  },
  info: function(_msg) {
    var args = Array.prototype.slice.call(arguments, 1);
    console.info.apply(
      undefined, beautify_message(
        colors.fg.Yellow, 'INFO', _msg, args
      )
    );
  },
  error: function(_err) {
    var args = Array.prototype.slice.call(arguments, 1);
    console.error.apply(
      undefined, beautify_message(
        colors.fg.Red, 'ERROR', _err, args
      )
    );
    process.exit(1);
  },
  debug2: function(_msg) {
    if (l_detailed_debug && l_show_debug) {
      var args = Array.prototype.slice.call(arguments, 1);
      console.info.apply(
        undefined, beautify_message(
          colors.fg.Yellow + colors.Dim, 'DEBUG2', _msg, args
        )
      );
    }
  },
  warning: function(_msg) {
    var args = Array.prototype.slice.call(arguments, 1);
    console.error.apply(
      undefined, beautify_message(
        colors.fg.Yellow + colors.Bright, 'WARNING', _msg, args
      )
    );
  }
}

