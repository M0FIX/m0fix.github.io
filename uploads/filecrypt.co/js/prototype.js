/*  Prototype JavaScript framework, version 1.7.1
 *  (c) 2005-2010 Sam Stephenson
 *
 *  Prototype is freely distributable under the terms of an MIT-style license.
 *  For details, see the Prototype web site: http://www.prototypejs.org/
 *
 *--------------------------------------------------------------------------*/

var Prototype = {

    UUID: null,

    Version: '1.7.1',

    Browser: (function() {
        var ua = navigator.userAgent;
        var isOpera = (Object.prototype.toString.call(window.opera) == '[object Opera]') || ua.indexOf('OPR/') > -1;
        return {
            IE: !!window.attachEvent && !isOpera,
            IE_NEW: ua.indexOf('Trident') > -1,
            Opera: isOpera,
            WebKit: ua.indexOf('AppleWebKit/') > -1,
            Gecko: ua.indexOf('Gecko') > -1 && ua.indexOf('KHTML') === -1,
            MobileSafari: /Apple.*Mobile/.test(ua)
        }
    })(),

    BrowserFeatures: {
        XPath: !!document.evaluate,

        SelectorsAPI: !!document.querySelector,

        ElementExtensions: (function() {
            var constructor = window.Element || window.HTMLElement;
            return !!(constructor && constructor.prototype);
        })(),
        SpecificElementExtensions: (function() {
            if (typeof window.HTMLDivElement !== 'undefined')
                return true;

            var div = document.createElement('div'),
                form = document.createElement('form'),
                isSupported = false;

            if (div['__proto__'] && (div['__proto__'] !== form['__proto__'])) {
                isSupported = true;
            }

            div = form = null;

            return isSupported;
        })()
    },

    ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script\\s*>',
    JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,

    emptyFunction: function() {},

    K: function(x) {
        return x
    }
};

if (Prototype.Browser.MobileSafari)
    Prototype.BrowserFeatures.SpecificElementExtensions = false;
/* Based on Alex Arnell's inheritance implementation. */

var Class = (function() {

    var IS_DONTENUM_BUGGY = (function() {
        for (var p in {
                toString: 1
            }) {
            if (p === 'toString')
                return false;
        }
        return true;
    })();

    function subclass() {};

    function create() {
        var parent = null,
            properties = $A(arguments);
        if (Object.isFunction(properties[0]))
            parent = properties.shift();

        function klass() {
            this.initialize.apply(this, arguments);
        }


        Object.extend(klass, Class.Methods);
        klass.superclass = parent;
        klass.subclasses = [];

        if (parent) {
            subclass.prototype = parent.prototype;
            klass.prototype = new subclass;
            parent.subclasses.push(klass);
        }

        for (var i = 0, length = properties.length; i < length; i++)
            klass.addMethods(properties[i]);

        if (!klass.prototype.initialize)
            klass.prototype.initialize = Prototype.emptyFunction;

        klass.prototype.constructor = klass;
        return klass;
    }

    function addMethods(source) {
        var ancestor = this.superclass && this.superclass.prototype,
            properties = Object.keys(source);

        if (IS_DONTENUM_BUGGY) {
            if (source.toString != Object.prototype.toString)
                properties.push("toString");
            if (source.valueOf != Object.prototype.valueOf)
                properties.push("valueOf");
        }

        for (var i = 0, length = properties.length; i < length; i++) {
            var property = properties[i],
                value = source[property];
            if (ancestor && Object.isFunction(value) && value.argumentNames()[0] == "$super") {
                var method = value;
                value = (function(m) {
                    return function() {
                        return ancestor[m].apply(this, arguments);
                    };
                })(property).wrap(method);

                value.valueOf = (function(method) {
                    return function() {
                        return method.valueOf.call(method);
                    };
                })(method);

                value.toString = (function(method) {
                    return function() {
                        return method.toString.call(method);
                    };
                })(method);
            }
            this.prototype[property] = value;
        }

        return this;
    }

    return {
        create: create,
        Methods: {
            addMethods: addMethods
        }
    };
})();
(function() {

    var _toString = Object.prototype.toString,
        _hasOwnProperty = Object.prototype.hasOwnProperty,
        NULL_TYPE = 'Null',
        UNDEFINED_TYPE = 'Undefined',
        BOOLEAN_TYPE = 'Boolean',
        NUMBER_TYPE = 'Number',
        STRING_TYPE = 'String',
        OBJECT_TYPE = 'Object',
        FUNCTION_CLASS = '[object Function]',
        BOOLEAN_CLASS = '[object Boolean]',
        NUMBER_CLASS = '[object Number]',
        STRING_CLASS = '[object String]',
        ARRAY_CLASS = '[object Array]',
        DATE_CLASS = '[object Date]',
        NATIVE_JSON_STRINGIFY_SUPPORT = window.JSON && typeof JSON.stringify === 'function' && JSON.stringify(0) === '0' && typeof JSON.stringify(Prototype.K) === 'undefined';

    var DONT_ENUMS = ['toString', 'toLocaleString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'constructor'];

    var IS_DONTENUM_BUGGY = (function() {
        for (var p in {
                toString: 1
            }) {
            if (p === 'toString')
                return false;
        }
        return true;
    })();

    function Type(o) {
        switch (o) {
            case null:
                return NULL_TYPE;
            case (void 0):
                return UNDEFINED_TYPE;
        }
        var type = typeof o;
        switch (type) {
            case 'boolean':
                return BOOLEAN_TYPE;
            case 'number':
                return NUMBER_TYPE;
            case 'string':
                return STRING_TYPE;
        }
        return OBJECT_TYPE;
    }

    function extend(destination, source) {
        for (var property in source)
            destination[property] = source[property];
        return destination;
    }

    function inspect(object) {
        try {
            if (isUndefined(object))
                return 'undefined';
            if (object === null)
                return 'null';
            return object.inspect ? object.inspect() : String(object);
        } catch (e) {
            if (e instanceof RangeError)
                return '...';
            throw e;
        }
    }

    function toJSON(value) {
        return Str('', {
            '': value
        }, []);
    }

    function Str(key, holder, stack) {
        var value = holder[key];
        if (Type(value) === OBJECT_TYPE && typeof value.toJSON === 'function') {
            value = value.toJSON(key);
        }

        var _class = _toString.call(value);

        switch (_class) {
            case NUMBER_CLASS:
            case BOOLEAN_CLASS:
            case STRING_CLASS:
                value = value.valueOf();
        }

        switch (value) {
            case null:
                return 'null';
            case true:
                return 'true';
            case false:
                return 'false';
        }

        var type = typeof value;
        switch (type) {
            case 'string':
                return value.inspect(true);
            case 'number':
                return isFinite(value) ? String(value) : 'null';
            case 'object':

                for (var i = 0, length = stack.length; i < length; i++) {
                    if (stack[i] === value) {
                        throw new TypeError("Cyclic reference to '" + value + "' in object");
                    }
                }
                stack.push(value);

                var partial = [];
                if (_class === ARRAY_CLASS) {
                    for (var i = 0, length = value.length; i < length; i++) {
                        var str = Str(i, value, stack);
                        partial.push(typeof str === 'undefined' ? 'null' : str);
                    }
                    partial = '[' + partial.join(',') + ']';
                } else {
                    var keys = Object.keys(value);
                    for (var i = 0, length = keys.length; i < length; i++) {
                        var key = keys[i],
                            str = Str(key, value, stack);
                        if (typeof str !== "undefined") {
                            partial.push(key.inspect(true) + ':' + str);
                        }
                    }
                    partial = '{' + partial.join(',') + '}';
                }
                stack.pop();
                return partial;
        }
    }

    function stringify(object) {
        return JSON.stringify(object);
    }

    function toQueryString(object) {
        return $H(object).toQueryString();
    }

    function toHTML(object) {
        return object && object.toHTML ? object.toHTML() : String.interpret(object);
    }

    function keys(object) {
        if (Type(object) !== OBJECT_TYPE) {
            throw new TypeError();
        }
        var results = [];
        for (var property in object) {
            if (_hasOwnProperty.call(object, property))
                results.push(property);
        }

        if (IS_DONTENUM_BUGGY) {
            for (var i = 0; property = DONT_ENUMS[i]; i++) {
                if (_hasOwnProperty.call(object, property))
                    results.push(property);
            }
        }

        return results;
    }

    function values(object) {
        var results = [];
        for (var property in object)
            results.push(object[property]);
        return results;
    }

    function clone(object) {
        return extend({}, object);
    }

    function isElement(object) {
        return !!(object && object.nodeType == 1);
    }

    function isArray(object) {
        return _toString.call(object) === ARRAY_CLASS;
    }

    var hasNativeIsArray = (typeof Array.isArray == 'function') && Array.isArray([]) && !Array.isArray({});

    if (hasNativeIsArray) {
        isArray = Array.isArray;
    }

    function isHash(object) {
        return object instanceof Hash;
    }

    function isFunction(object) {
        return _toString.call(object) === FUNCTION_CLASS;
    }

    function isString(object) {
        return _toString.call(object) === STRING_CLASS;
    }

    function isNumber(object) {
        return _toString.call(object) === NUMBER_CLASS;
    }

    function isDate(object) {
        return _toString.call(object) === DATE_CLASS;
    }

    function isUndefined(object) {
        return typeof object === "undefined";
    }

    extend(Object, {
        extend: extend,
        inspect: inspect,
        toJSON: NATIVE_JSON_STRINGIFY_SUPPORT ? stringify : toJSON,
        toQueryString: toQueryString,
        toHTML: toHTML,
        keys: Object.keys || keys,
        values: values,
        clone: clone,
        isElement: isElement,
        isArray: isArray,
        isHash: isHash,
        isFunction: isFunction,
        isString: isString,
        isNumber: isNumber,
        isDate: isDate,
        isUndefined: isUndefined
    });
})();
Object.extend(Function.prototype, (function() {
    var slice = Array.prototype.slice;

    function update(array, args) {
        var arrayLength = array.length,
            length = args.length;
        while (length--)
            array[arrayLength + length] = args[length];
        return array;
    }

    function merge(array, args) {
        array = slice.call(array, 0);
        return update(array, args);
    }

    function argumentNames() {
        var names = this.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1].replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '').replace(/\s+/g, '').split(',');
        return names.length == 1 && !names[0] ? [] : names;
    }

    function bind(context) {
        if (arguments.length < 2 && Object.isUndefined(arguments[0]))
            return this;

        if (!Object.isFunction(this))
            throw new TypeError("The object is not callable.");

        var nop = function() {};
        var __method = this,
            args = slice.call(arguments, 1);

        var bound = function() {
            var a = merge(args, arguments),
                c = context;
            var c = this instanceof bound ? this : context;
            return __method.apply(c, a);
        };

        nop.prototype = this.prototype;
        bound.prototype = new nop();

        return bound;
    }

    function bindAsEventListener(context) {
        var __method = this,
            args = slice.call(arguments, 1);
        return function(event) {
            var a = update([event || window.event], args);
            return __method.apply(context, a);
        }
    }

    function curry() {
        if (!arguments.length)
            return this;
        var __method = this,
            args = slice.call(arguments, 0);
        return function() {
            var a = merge(args, arguments);
            return __method.apply(this, a);
        }
    }

    function delay(timeout) {
        var __method = this,
            args = slice.call(arguments, 1);
        timeout = timeout * 1000;
        return window.setTimeout(function() {
            return __method.apply(__method, args);
        }, timeout);
    }

    function defer() {
        var args = update([0.01], arguments);
        return this.delay.apply(this, args);
    }

    function wrap(wrapper) {
        var __method = this;
        return function() {
            var a = update([__method.bind(this)], arguments);
            return wrapper.apply(this, a);
        }
    }

    function methodize() {
        if (this._methodized)
            return this._methodized;
        var __method = this;
        return this._methodized = function() {
            var a = update([this], arguments);
            return __method.apply(null, a);
        };
    }

    var extensions = {
        argumentNames: argumentNames,
        bindAsEventListener: bindAsEventListener,
        curry: curry,
        delay: delay,
        defer: defer,
        wrap: wrap,
        methodize: methodize
    };

    if (!Function.prototype.bind)
        extensions.bind = bind;

    return extensions;
})());

(function(proto) {

    function toISOString() {
        return this.getUTCFullYear() + '-' + (this.getUTCMonth() + 1).toPaddedString(2) + '-' + this.getUTCDate().toPaddedString(2) + 'T' + this.getUTCHours().toPaddedString(2) + ':' + this.getUTCMinutes().toPaddedString(2) + ':' + this.getUTCSeconds().toPaddedString(2) + 'Z';
    }

    function toJSON() {
        return this.toISOString();
    }

    if (!proto.toISOString)
        proto.toISOString = toISOString;
    if (!proto.toJSON)
        proto.toJSON = toJSON;

})(Date.prototype);

RegExp.prototype.match = RegExp.prototype.test;

RegExp.escape = function(str) {
    return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
};
var PeriodicalExecuter = Class.create({
    initialize: function(callback, frequency) {
        this.callback = callback;
        this.frequency = frequency;
        this.currentlyExecuting = false;

        this.registerCallback();
    },

    registerCallback: function() {
        this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
    },

    execute: function() {
        this.callback(this);
    },

    stop: function() {
        if (!this.timer)
            return;
        clearInterval(this.timer);
        this.timer = null;
    },

    onTimerEvent: function() {
        if (!this.currentlyExecuting) {
            try {
                this.currentlyExecuting = true;
                this.execute();
                this.currentlyExecuting = false;
            } catch (e) {
                this.currentlyExecuting = false;
                throw e;
            }
        }
    }
});
Object.extend(String, {
    interpret: function(value) {
        return value == null ? '' : String(value);
    },
    specialChar: {
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '\\': '\\\\'
    }
});

Object.extend(String.prototype, (function() {
    var NATIVE_JSON_PARSE_SUPPORT = window.JSON && typeof JSON.parse === 'function' && JSON.parse('{"test": true}').test;

    function prepareReplacement(replacement) {
        if (Object.isFunction(replacement))
            return replacement;
        var template = new Template(replacement);
        return function(match) {
            return template.evaluate(match)
        };
    }

    function gsub(pattern, replacement) {
        var result = '',
            source = this,
            match;
        replacement = prepareReplacement(replacement);

        if (Object.isString(pattern))
            pattern = RegExp.escape(pattern);

        if (!(pattern.length || pattern.source)) {
            replacement = replacement('');
            return replacement + source.split('').join(replacement) + replacement;
        }

        while (source.length > 0) {
            if (match = source.match(pattern)) {
                result += source.slice(0, match.index);
                result += String.interpret(replacement(match));
                source = source.slice(match.index + match[0].length);
            } else {
                result += source, source = '';
            }
        }
        return result;
    }

    function sub(pattern, replacement, count) {
        replacement = prepareReplacement(replacement);
        count = Object.isUndefined(count) ? 1 : count;

        return this.gsub(pattern, function(match) {
            if (--count < 0)
                return match[0];
            return replacement(match);
        });
    }

    function scan(pattern, iterator) {
        this.gsub(pattern, iterator);
        return String(this);
    }

    function truncate(length, truncation) {
        length = length || 30;
        truncation = Object.isUndefined(truncation) ? '...' : truncation;
        return this.length > length ? this.slice(0, length - truncation.length) + truncation : String(this);
    }

    function strip() {
        return this.replace(/^\s+/, '').replace(/\s+$/, '');
    }

    function stripTags() {
        return this.replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi, '');
    }

    function stripScripts() {
        return this.replace(new RegExp(Prototype.ScriptFragment, 'img'), '');
    }

    function extractScripts() {
        var matchAll = new RegExp(Prototype.ScriptFragment, 'img'),
            matchOne = new RegExp(Prototype.ScriptFragment, 'im');
        return (this.match(matchAll) || []).map(function(scriptTag) {
            return (scriptTag.match(matchOne) || ['', ''])[1];
        });
    }

    function evalScripts() {
        return this.extractScripts().map(function(script) {
            return eval(script);
        });
    }

    function escapeHTML() {
        return this.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function unescapeHTML() {
        return this.stripTags().replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    }

    function toQueryParams(separator) {
        var match = this.strip().match(/([^?#]*)(#.*)?$/);
        if (!match)
            return {};

        return match[1].split(separator || '&').inject({}, function(hash, pair) {
            if ((pair = pair.split('='))[0]) {
                var key = decodeURIComponent(pair.shift()),
                    value = pair.length > 1 ? pair.join('=') : pair[0];

                if (value != undefined)
                    value = decodeURIComponent(value);

                if (key in hash) {
                    if (!Object.isArray(hash[key]))
                        hash[key] = [hash[key]];
                    hash[key].push(value);
                } else
                    hash[key] = value;
            }
            return hash;
        });
    }

    function toArray() {
        return this.split('');
    }

    function succ() {
        return this.slice(0, this.length - 1) + String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
    }

    function times(count) {
        return count < 1 ? '' : new Array(count + 1).join(this);
    }

    function camelize() {
        return this.replace(/-+(.)?/g, function(match, chr) {
            return chr ? chr.toUpperCase() : '';
        });
    }

    function capitalize() {
        return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
    }

    function underscore() {
        return this.replace(/::/g, '/').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').replace(/([a-z\d])([A-Z])/g, '$1_$2').replace(/-/g, '_').toLowerCase();
    }

    function dasherize() {
        return this.replace(/_/g, '-');
    }

    function inspect(useDoubleQuotes) {
        var escapedString = this.replace(/[\x00-\x1f\\]/g, function(character) {
            if (character in String.specialChar) {
                return String.specialChar[character];
            }
            return '\\u00' + character.charCodeAt().toPaddedString(2, 16);
        });
        if (useDoubleQuotes)
            return '"' + escapedString.replace(/"/g, '\\"') + '"';
        return "'" + escapedString.replace(/'/g, '\\\'') + "'";
    }

    function unfilterJSON(filter) {
        return this.replace(filter || Prototype.JSONFilter, '$1');
    }

    function isJSON() {
        var str = this;
        if (str.blank())
            return false;
        str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
        str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
        str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '');
        return (/^[\],:{}\s]*$/).test(str);
    }

    function evalJSON(sanitize) {
        var json = this.unfilterJSON(),
            cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
        if (cx.test(json)) {
            json = json.replace(cx, function(a) {
                return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            });
        }
        try {
            if (!sanitize || json.isJSON())
                return eval('(' + json + ')');
        } catch (e) {}
        throw new SyntaxError('Badly formed JSON string: ' + this.inspect());
    }

    function parseJSON() {
        var json = this.unfilterJSON();
        return JSON.parse(json);
    }

    function include(pattern) {
        return this.indexOf(pattern) > -1;
    }

    function startsWith(pattern) {
        return this.lastIndexOf(pattern, 0) === 0;
    }

    function endsWith(pattern) {
        var d = this.length - pattern.length;
        return d >= 0 && this.indexOf(pattern, d) === d;
    }

    function empty() {
        return this == '';
    }

    function blank() {
        return /^\s*$/.test(this);
    }

    function interpolate(object, pattern) {
        return new Template(this, pattern).evaluate(object);
    }

    return {
        gsub: gsub,
        sub: sub,
        scan: scan,
        truncate: truncate,
        strip: String.prototype.trim || strip,
        stripTags: stripTags,
        stripScripts: stripScripts,
        extractScripts: extractScripts,
        evalScripts: evalScripts,
        escapeHTML: escapeHTML,
        unescapeHTML: unescapeHTML,
        toQueryParams: toQueryParams,
        parseQuery: toQueryParams,
        toArray: toArray,
        succ: succ,
        times: times,
        camelize: camelize,
        capitalize: capitalize,
        underscore: underscore,
        dasherize: dasherize,
        inspect: inspect,
        unfilterJSON: unfilterJSON,
        isJSON: isJSON,
        evalJSON: NATIVE_JSON_PARSE_SUPPORT ? parseJSON : evalJSON,
        include: include,
        startsWith: startsWith,
        endsWith: endsWith,
        empty: empty,
        blank: blank,
        interpolate: interpolate
    };
})());

var Template = Class.create({
    initialize: function(template, pattern) {
        this.template = template.toString();
        this.pattern = pattern || Template.Pattern;
    },

    evaluate: function(object) {
        if (object && Object.isFunction(object.toTemplateReplacements))
            object = object.toTemplateReplacements();

        return this.template.gsub(this.pattern, function(match) {
            if (object == null)
                return (match[1] + '');

            var before = match[1] || '';
            if (before == '\\')
                return match[2];

            var ctx = object,
                expr = match[3],
                pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;

            match = pattern.exec(expr);
            if (match == null)
                return before;

            while (match != null) {
                var comp = match[1].startsWith('[') ? match[2].replace(/\\\\]/g, ']') : match[1];
                ctx = ctx[comp];
                if (null == ctx || '' == match[3])
                    break;
                expr = expr.substring('[' == match[3] ? match[1].length : match[0].length);
                match = pattern.exec(expr);
            }

            return before + String.interpret(ctx);
        });
    }
});
Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;

var $break = {};

var Enumerable = (function() {
    function each(iterator, context) {
        try {
            this._each(iterator, context);
        } catch (e) {
            //if (e != $break)
            //	throw e;
        }
        return this;
    }

    function eachSlice(number, iterator, context) {
        var index = -number,
            slices = [],
            array = this.toArray();
        if (number < 1)
            return array;
        while ((index += number) < array.length)
            slices.push(array.slice(index, index + number));
        return slices.collect(iterator, context);
    }

    function all(iterator, context) {
        iterator = iterator || Prototype.K;
        var result = true;
        this.each(function(value, index) {
            if (!iterator.call(context, value, index, this)) {
                result = false;
                throw $break;
            }
        }, this);
        return result;
    }

    function any(iterator, context) {
        iterator = iterator || Prototype.K;
        var result = false;
        this.each(function(value, index) {
            if (result = !!iterator.call(context, value, index, this))
                throw $break;
        }, this);
        return result;
    }

    function collect(iterator, context) {
        iterator = iterator || Prototype.K;
        var results = [];
        this.each(function(value, index) {
            results.push(iterator.call(context, value, index, this));
        }, this);
        return results;
    }

    function detect(iterator, context) {
        var result;
        this.each(function(value, index) {
            if (iterator.call(context, value, index, this)) {
                result = value;
                throw $break;
            }
        }, this);
        return result;
    }

    function findAll(iterator, context) {
        var results = [];
        this.each(function(value, index) {
            if (iterator.call(context, value, index, this))
                results.push(value);
        }, this);
        return results;
    }

    function grep(filter, iterator, context) {
        iterator = iterator || Prototype.K;
        var results = [];

        if (Object.isString(filter))
            filter = new RegExp(RegExp.escape(filter));

        this.each(function(value, index) {
            if (filter.match(value))
                results.push(iterator.call(context, value, index, this));
        }, this);
        return results;
    }

    function include(object) {
        if (Object.isFunction(this.indexOf))
            if (this.indexOf(object) != -1)
                return true;

        var found = false;
        this.each(function(value) {
            if (value == object) {
                found = true;
                throw $break;
            }
        });
        return found;
    }

    function inGroupsOf(number, fillWith) {
        fillWith = Object.isUndefined(fillWith) ? null : fillWith;
        return this.eachSlice(number, function(slice) {
            while (slice.length < number)
                slice.push(fillWith);
            return slice;
        });
    }

    function inject(memo, iterator, context) {
        this.each(function(value, index) {
            memo = iterator.call(context, memo, value, index, this);
        }, this);
        return memo;
    }

    function invoke(method) {
        var args = $A(arguments).slice(1);
        return this.map(function(value) {
            return value[method].apply(value, args);
        });
    }

    function max(iterator, context) {
        iterator = iterator || Prototype.K;
        var result;
        this.each(function(value, index) {
            value = iterator.call(context, value, index, this);
            if (result == null || value >= result)
                result = value;
        }, this);
        return result;
    }

    function min(iterator, context) {
        iterator = iterator || Prototype.K;
        var result;
        this.each(function(value, index) {
            value = iterator.call(context, value, index, this);
            if (result == null || value < result)
                result = value;
        }, this);
        return result;
    }

    function partition(iterator, context) {
        iterator = iterator || Prototype.K;
        var trues = [],
            falses = [];
        this.each(function(value, index) {
            (iterator.call(context, value, index, this) ? trues : falses).push(value);
        }, this);
        return [trues, falses];
    }

    function pluck(property) {
        var results = [];
        this.each(function(value) {
            results.push(value[property]);
        });
        return results;
    }

    function reject(iterator, context) {
        var results = [];
        this.each(function(value, index) {
            if (!iterator.call(context, value, index, this))
                results.push(value);
        }, this);
        return results;
    }

    function sortBy(iterator, context) {
        return this.map(function(value, index) {
            return {
                value: value,
                criteria: iterator.call(context, value, index, this)
            };
        }, this).sort(function(left, right) {
            var a = left.criteria,
                b = right.criteria;
            return a < b ? -1 : a > b ? 1 : 0;
        }).pluck('value');
    }

    function toArray() {
        return this.map();
    }

    function zip() {
        var iterator = Prototype.K,
            args = $A(arguments);
        if (Object.isFunction(args.last()))
            iterator = args.pop();

        var collections = [this].concat(args).map($A);
        return this.map(function(value, index) {
            return iterator(collections.pluck(index));
        });
    }

    function size() {
        return this.toArray().length;
    }

    function inspect() {
        return '#<Enumerable:' + this.toArray().inspect() + '>';
    }

    return {
        each: each,
        eachSlice: eachSlice,
        all: all,
        every: all,
        any: any,
        some: any,
        collect: collect,
        map: collect,
        detect: detect,
        findAll: findAll,
        select: findAll,
        filter: findAll,
        grep: grep,
        include: include,
        member: include,
        inGroupsOf: inGroupsOf,
        inject: inject,
        invoke: invoke,
        max: max,
        min: min,
        partition: partition,
        pluck: pluck,
        reject: reject,
        sortBy: sortBy,
        toArray: toArray,
        entries: toArray,
        zip: zip,
        size: size,
        inspect: inspect,
        find: detect
    };
})();

function $A(iterable) {
    if (!iterable)
        return [];
    if ('toArray' in Object(iterable))
        return iterable.toArray();
    var length = iterable.length || 0,
        results = new Array(length);
    while (length--)
        results[length] = iterable[length];
    return results;
}

function $w(string) {
    if (!Object.isString(string))
        return [];
    string = string.strip();
    return string ? string.split(/\s+/) : [];
}

Array.from = $A;

(function() {
    var arrayProto = Array.prototype,
        slice = arrayProto.slice,
        _each = arrayProto.forEach;
    // use native browser JS 1.6 implementation if available

    function each(iterator, context) {
        for (var i = 0, length = this.length >>> 0; i < length; i++) {
            if (i in this)
                iterator.call(context, this[i], i, this);
        }
    }

    if (!_each)
        _each = each;

    function clear() {
        this.length = 0;
        return this;
    }

    function first() {
        return this[0];
    }

    function last() {
        return this[this.length - 1];
    }

    function compact() {
        return this.select(function(value) {
            return value != null;
        });
    }

    function flatten() {
        return this.inject([], function(array, value) {
            if (Object.isArray(value))
                return array.concat(value.flatten());
            array.push(value);
            return array;
        });
    }

    function without() {
        var values = slice.call(arguments, 0);
        return this.select(function(value) {
            return !values.include(value);
        });
    }

    function reverse(inline) {
        return (inline === false ? this.toArray() : this)._reverse();
    }

    function uniq(sorted) {
        return this.inject([], function(array, value, index) {
            if (0 == index || (sorted ? array.last() != value : !array.include(value)))
                array.push(value);
            return array;
        });
    }

    function intersect(array) {
        return this.uniq().findAll(function(item) {
            return array.indexOf(item) !== -1;
        });
    }

    function clone() {
        return slice.call(this, 0);
    }

    function size() {
        return this.length;
    }

    function inspect() {
        return '[' + this.map(Object.inspect).join(', ') + ']';
    }

    function indexOf(item, i) {
        if (this == null)
            throw new TypeError();

        var array = Object(this),
            length = array.length >>> 0;
        if (length === 0)
            return -1;

        i = Number(i);
        if (isNaN(i)) {
            i = 0;
        } else if (i !== 0 && isFinite(i)) {
            i = (i > 0 ? 1 : -1) * Math.floor(Math.abs(i));
        }

        if (i > length)
            return -1;

        var k = i >= 0 ? i : Math.max(length - Math.abs(i), 0);
        for (; k < length; k++)
            if (k in array && array[k] === item)
                return k;
        return -1;
    }

    function lastIndexOf(item, i) {
        if (this == null)
            throw new TypeError();

        var array = Object(this),
            length = array.length >>> 0;
        if (length === 0)
            return -1;

        if (!Object.isUndefined(i)) {
            i = Number(i);
            if (isNaN(i)) {
                i = 0;
            } else if (i !== 0 && isFinite(i)) {
                i = (i > 0 ? 1 : -1) * Math.floor(Math.abs(i));
            }
        } else {
            i = length;
        }

        var k = i >= 0 ? Math.min(i, length - 1) : length - Math.abs(i);

        for (; k >= 0; k--)
            if (k in array && array[k] === item)
                return k;
        return -1;
    }

    function concat(_) {
        var array = [],
            items = slice.call(arguments, 0),
            item, n = 0;
        items.unshift(this);
        for (var i = 0, length = items.length; i < length; i++) {
            item = items[i];
            if (Object.isArray(item) && !('callee' in item)) {
                for (var j = 0, arrayLength = item.length; j < arrayLength; j++) {
                    if (j in item)
                        array[n] = item[j];
                    n++;
                }
            } else {
                array[n++] = item;
            }
        }
        array.length = n;
        return array;
    }

    function wrapNative(method) {
        return function() {
            if (arguments.length === 0) {
                return method.call(this, Prototype.K);
            } else if (arguments[0] === undefined) {
                var args = slice.call(arguments, 1);
                args.unshift(Prototype.K);
                return method.apply(this, args);
            } else {
                return method.apply(this, arguments);
            }
        };
    }

    function map(iterator) {
        if (this == null)
            throw new TypeError();
        iterator = iterator || Prototype.K;

        var object = Object(this);
        var results = [],
            context = arguments[1],
            n = 0;

        for (var i = 0, length = object.length >>> 0; i < length; i++) {
            if (i in object) {
                results[n] = iterator.call(context, object[i], i, object);
            }
            n++;
        }
        results.length = n;
        return results;
    }

    if (arrayProto.map) {
        map = wrapNative(Array.prototype.map);
    }

    function filter(iterator) {
        if (this == null || !Object.isFunction(iterator))
            throw new TypeError();

        var object = Object(this);
        var results = [],
            context = arguments[1],
            value;

        for (var i = 0, length = object.length >>> 0; i < length; i++) {
            if (i in object) {
                value = object[i];
                if (iterator.call(context, value, i, object)) {
                    results.push(value);
                }
            }
        }
        return results;
    }

    if (arrayProto.filter) {
        filter = Array.prototype.filter;
    }

    function some(iterator) {
        if (this == null)
            throw new TypeError();
        iterator = iterator || Prototype.K;
        var context = arguments[1];

        var object = Object(this);
        for (var i = 0, length = object.length >>> 0; i < length; i++) {
            if (i in object && iterator.call(context, object[i], i, object)) {
                return true;
            }
        }

        return false;
    }

    if (arrayProto.some) {
        var some = wrapNative(Array.prototype.some);
    }

    function every(iterator) {
        if (this == null)
            throw new TypeError();
        iterator = iterator || Prototype.K;
        var context = arguments[1];

        var object = Object(this);
        for (var i = 0, length = object.length >>> 0; i < length; i++) {
            if (i in object && !iterator.call(context, object[i], i, object)) {
                return false;
            }
        }

        return true;
    }

    if (arrayProto.every) {
        var every = wrapNative(Array.prototype.every);
    }

    var _reduce = arrayProto.reduce;

    function inject(memo, iterator) {
        iterator = iterator || Prototype.K;
        var context = arguments[2];
        return _reduce.call(this, iterator.bind(context), memo);
    }

    if (!arrayProto.reduce) {
        var inject = Enumerable.inject;
    }

    Object.extend(arrayProto, Enumerable);

    if (!arrayProto._reverse)
        arrayProto._reverse = arrayProto.reverse;

    Object.extend(arrayProto, {
        _each: _each,

        map: map,
        collect: map,
        select: filter,
        filter: filter,
        findAll: filter,
        some: some,
        any: some,
        every: every,
        all: every,
        inject: inject,

        clear: clear,
        first: first,
        last: last,
        compact: compact,
        flatten: flatten,
        without: without,
        reverse: reverse,
        uniq: uniq,
        intersect: intersect,
        clone: clone,
        toArray: clone,
        size: size,
        inspect: inspect
    });

    var CONCAT_ARGUMENTS_BUGGY = (function() {
        return [].concat(arguments)[0][0] !== 1;
    })(1, 2);

    if (CONCAT_ARGUMENTS_BUGGY)
        arrayProto.concat = concat;

    if (!arrayProto.indexOf)
        arrayProto.indexOf = indexOf;
    if (!arrayProto.lastIndexOf)
        arrayProto.lastIndexOf = lastIndexOf;
})();

function $H(object) {
    return new Hash(object);
};

var Hash = Class.create(Enumerable, (function() {
    function initialize(object) {
        this._object = Object.isHash(object) ? object.toObject() : Object.clone(object);
    }

    function _each(iterator, context) {
        for (var key in this._object) {
            var value = this._object[key],
                pair = [key, value];
            pair.key = key;
            pair.value = value;
            iterator.call(context, pair);
        }
    }

    function set(key, value) {
        return this._object[key] = value;
    }

    function get(key) {
        if (this._object[key] !== Object.prototype[key])
            return this._object[key];
    }

    function unset(key) {
        var value = this._object[key];
        delete this._object[key];
        return value;
    }

    function toObject() {
        return Object.clone(this._object);
    }

    function keys() {
        return this.pluck('key');
    }

    function values() {
        return this.pluck('value');
    }

    function index(value) {
        var match = this.detect(function(pair) {
            return pair.value === value;
        });
        return match && match.key;
    }

    function merge(object) {
        return this.clone().update(object);
    }

    function update(object) {
        return new Hash(object).inject(this, function(result, pair) {
            result.set(pair.key, pair.value);
            return result;
        });
    }

    function toQueryPair(key, value) {
        if (Object.isUndefined(value))
            return key;

        var value = String.interpret(value);

        value = value.gsub(/(\r)?\n/, '\r\n');
        value = encodeURIComponent(value);
        value = value.gsub(/%20/, '+');
        return key + '=' + value;
    }

    function toQueryString() {
        return this.inject([], function(results, pair) {
            var key = encodeURIComponent(pair.key),
                values = pair.value;

            if (values && typeof values == 'object') {
                if (Object.isArray(values)) {
                    var queryValues = [];
                    for (var i = 0, len = values.length, value; i < len; i++) {
                        value = values[i];
                        queryValues.push(toQueryPair(key, value));
                    }
                    return results.concat(queryValues);
                }
            } else
                results.push(toQueryPair(key, values));
            return results;
        }).join('&');
    }

    function inspect() {
        return '#<Hash:{' + this.map(function(pair) {
            return pair.map(Object.inspect).join(': ');
        }).join(', ') + '}>';
    }

    function clone() {
        return new Hash(this);
    }

    return {
        initialize: initialize,
        _each: _each,
        set: set,
        get: get,
        unset: unset,
        toObject: toObject,
        toTemplateReplacements: toObject,
        keys: keys,
        values: values,
        index: index,
        merge: merge,
        update: update,
        toQueryString: toQueryString,
        inspect: inspect,
        toJSON: toObject,
        clone: clone
    };
})());

Hash.from = $H;
Object.extend(Number.prototype, (function() {
    function toColorPart() {
        return this.toPaddedString(2, 16);
    }

    function succ() {
        return this + 1;
    }

    function times(iterator, context) {
        $R(0, this, true).each(iterator, context);
        return this;
    }

    function toPaddedString(length, radix) {
        var string = this.toString(radix || 10);
        return '0'.times(length - string.length) + string;
    }

    function abs() {
        return Math.abs(this);
    }

    function round() {
        return Math.round(this);
    }

    function ceil() {
        return Math.ceil(this);
    }

    function floor() {
        return Math.floor(this);
    }

    return {
        toColorPart: toColorPart,
        succ: succ,
        times: times,
        toPaddedString: toPaddedString,
        abs: abs,
        round: round,
        ceil: ceil,
        floor: floor
    };
})());

function $R(start, end, exclusive) {
    return new ObjectRange(start, end, exclusive);
}

var ObjectRange = Class.create(Enumerable, (function() {
    function initialize(start, end, exclusive) {
        this.start = start;
        this.end = end;
        this.exclusive = exclusive;
    }

    function _each(iterator, context) {
        var value = this.start;
        while (this.include(value)) {
            iterator.call(context, value);
            value = value.succ();
        }
    }

    function include(value) {
        if (value < this.start)
            return false;
        if (this.exclusive)
            return value < this.end;
        return value <= this.end;
    }

    return {
        initialize: initialize,
        _each: _each,
        include: include
    };
})());

var Abstract = {};

var Try = {
    these: function() {
        var returnValue;

        for (var i = 0, length = arguments.length; i < length; i++) {
            var lambda = arguments[i];
            try {
                returnValue = lambda();
                break;
            } catch (e) {}
        }

        return returnValue;
    }
};

var Ajax = {
    getTransport: function() {
        return Try.these(function() {
            return new XMLHttpRequest()
        }, function() {
            return new ActiveXObject('Msxml2.XMLHTTP')
        }, function() {
            return new ActiveXObject('Microsoft.XMLHTTP')
        }) || false;
    },

    activeRequestCount: 0
};

Ajax.Responders = {
    responders: [],

    _each: function(iterator, context) {
        this.responders._each(iterator, context);
    },

    register: function(responder) {
        if (!this.include(responder))
            this.responders.push(responder);
    },

    unregister: function(responder) {
        this.responders = this.responders.without(responder);
    },

    dispatch: function(callback, request, transport, json) {
        this.each(function(responder) {
            if (Object.isFunction(responder[callback])) {
                try {
                    responder[callback].apply(responder, [request, transport, json]);
                } catch (e) {}
            }
        });
    }
};

Object.extend(Ajax.Responders, Enumerable);

Ajax.Responders.register({
    onCreate: function() {
        Ajax.activeRequestCount++
    },
    onComplete: function() {
        Ajax.activeRequestCount--
    }
});
Ajax.Base = Class.create({
    initialize: function(options) {
        this.options = {
            method: 'post',
            asynchronous: true,
            contentType: 'application/x-www-form-urlencoded',
            encoding: 'UTF-8',
            parameters: '',
            evalJSON: true,
            evalJS: true
        };
        Object.extend(this.options, options || {});

        this.options.method = this.options.method.toLowerCase();

        if (Object.isHash(this.options.parameters))
            this.options.parameters = this.options.parameters.toObject();
    }
});
Ajax.Request = Class.create(Ajax.Base, {
    _complete: false,

    initialize: function($super, url, options) {
        $super(options);
        this.transport = Ajax.getTransport();
        this.request(url);
    },

    request: function(url) {
        this.url = url;
        this.method = this.options.method;
        var params = Object.isString(this.options.parameters) ? this.options.parameters : Object.toQueryString(this.options.parameters);

        if (!['get', 'post'].include(this.method)) {
            params += (params ? '&' : '') + "_method=" + this.method;
            this.method = 'post';
        }

        if (params && this.method === 'get') {
            this.url += (this.url.include('?') ? '&' : '?') + params;
        }

        this.parameters = params.toQueryParams();

        try {
            var response = new Ajax.Response(this);
            if (this.options.onCreate)
                this.options.onCreate(response);
            Ajax.Responders.dispatch('onCreate', this, response);

            this.transport.open(this.method.toUpperCase(), this.url, this.options.asynchronous);

            if (this.options.asynchronous)
                this.respondToReadyState.bind(this).defer(1);

            this.transport.onreadystatechange = this.onStateChange.bind(this);
            this.setRequestHeaders();

            this.body = this.method == 'post' ? (this.options.postBody || params) : null;
            this.transport.send(this.body);

            /* Force Firefox to handle ready state 4 for synchronous requests */
            if (!this.options.asynchronous && this.transport.overrideMimeType)
                this.onStateChange();

        } catch (e) {
            this.dispatchException(e);
        }
    },

    onStateChange: function() {
        var readyState = this.transport.readyState;
        if (readyState > 1 && !((readyState == 4) && this._complete))
            this.respondToReadyState(this.transport.readyState);
    },

    setRequestHeaders: function() {
        var headers = {
            'X-Requested-With': 'XMLHttpRequest',
            'X-Prototype-Version': Prototype.Version,
            'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
        };

        if (this.method == 'post') {
            headers['Content-type'] = this.options.contentType + (this.options.encoding ? '; charset=' + this.options.encoding : '');

            /* Force "Connection: close" for older Mozilla browsers to work
             * around a bug where XMLHttpRequest sends an incorrect
             * Content-length header. See Mozilla Bugzilla #246651.
             */
            if (this.transport.overrideMimeType && (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0, 2005])[1] < 2005)
                headers['Connection'] = 'close';
        }

        if (typeof this.options.requestHeaders == 'object') {
            var extras = this.options.requestHeaders;

            if (Object.isFunction(extras.push))
                for (var i = 0, length = extras.length; i < length; i += 2)
                    headers[extras[i]] = extras[i + 1];
            else
                $H(extras).each(function(pair) {
                    headers[pair.key] = pair.value
                });
        }

        for (var name in headers)
            this.transport.setRequestHeader(name, headers[name]);
    },

    success: function() {
        var status = this.getStatus();
        return !status || (status >= 200 && status < 300) || status == 304;
    },

    getStatus: function() {
        try {
            if (this.transport.status === 1223)
                return 204;
            return this.transport.status || 0;
        } catch (e) {
            return 0
        }
    },

    respondToReadyState: function(readyState) {
        var state = Ajax.Request.Events[readyState],
            response = new Ajax.Response(this);

        if (state == 'Complete') {
            try {
                this._complete = true;
                (this.options['on' + response.status] || this.options['on' + (this.success() ? 'Success' : 'Failure')] || Prototype.emptyFunction)(response, response.headerJSON);
            } catch (e) {
                this.dispatchException(e);
            }

            var contentType = response.getHeader('Content-type');
            if (this.options.evalJS == 'force' || (this.options.evalJS && this.isSameOrigin() && contentType && contentType.match(/^\s*(text|application)\/(x-)?(java|ecma)script(;.*)?\s*$/i)))
                this.evalResponse();
        }

        try {
            (this.options['on' + state] || Prototype.emptyFunction)(response, response.headerJSON);
            Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON);
        } catch (e) {
            this.dispatchException(e);
        }

        if (state == 'Complete') {
            this.transport.onreadystatechange = Prototype.emptyFunction;
        }
    },

    isSameOrigin: function() {
        var m = this.url.match(/^\s*https?:\/\/[^\/]*/);
        return !m || (m[0] == '#{protocol}//#{domain}#{port}'.interpolate({
            protocol: location.protocol,
            domain: document.domain,
            port: location.port ? ':' + location.port : ''
        }));
    },

    getHeader: function(name) {
        try {
            return this.transport.getResponseHeader(name) || null;
        } catch (e) {
            return null;
        }
    },

    evalResponse: function() {
        try {
            return eval((this.transport.responseText || '').unfilterJSON());
        } catch (e) {
            this.dispatchException(e);
        }
    },

    dispatchException: function(exception) {
        (this.options.onException || Prototype.emptyFunction)(this, exception);
        Ajax.Responders.dispatch('onException', this, exception);
    }
});

Ajax.Request.Events = ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];

Ajax.Response = Class.create({
    initialize: function(request) {
        this.request = request;
        var transport = this.transport = request.transport,
            readyState = this.readyState = transport.readyState;

        if ((readyState > 2 && !Prototype.Browser.IE) || readyState == 4) {
            this.status = this.getStatus();
            this.statusText = this.getStatusText();
            this.responseText = String.interpret(transport.responseText);
            this.headerJSON = this._getHeaderJSON();
        }

        if (readyState == 4) {
            var xml = transport.responseXML;
            this.responseXML = Object.isUndefined(xml) ? null : xml;
            this.responseJSON = this._getResponseJSON();
        }
    },

    status: 0,

    statusText: '',

    getStatus: Ajax.Request.prototype.getStatus,

    getStatusText: function() {
        try {
            return this.transport.statusText || '';
        } catch (e) {
            return ''
        }
    },

    getHeader: Ajax.Request.prototype.getHeader,

    getAllHeaders: function() {
        try {
            return this.getAllResponseHeaders();
        } catch (e) {
            return null
        }
    },

    getResponseHeader: function(name) {
        return this.transport.getResponseHeader(name);
    },

    getAllResponseHeaders: function() {
        return this.transport.getAllResponseHeaders();
    },

    _getHeaderJSON: function() {
        var json = false;
        //this.getHeader('X-JSON');
        if (!json)
            return null;

        try {
            json = decodeURIComponent(escape(json));
        } catch (e) {}

        try {
            return json.evalJSON(this.request.options.sanitizeJSON || !this.request.isSameOrigin());
        } catch (e) {
            this.request.dispatchException(e);
        }
    },

    _getResponseJSON: function() {
        var options = this.request.options;
        if (!options.evalJSON || (options.evalJSON != 'force' && !(this.getHeader('Content-type') || '').include('application/json')) || this.responseText.blank())
            return null;
        try {
            return this.responseText.evalJSON(options.sanitizeJSON || !this.request.isSameOrigin());
        } catch (e) {
            this.request.dispatchException(e);
        }
    }
});

Ajax.Updater = Class.create(Ajax.Request, {
    initialize: function($super, container, url, options) {
        this.container = {
            success: (container.success || container),
            failure: (container.failure || (container.success ? null : container))
        };

        options = Object.clone(options);
        var onComplete = options.onComplete;
        options.onComplete = (function(response, json) {
            this.updateContent(response.responseText);
            if (Object.isFunction(onComplete))
                onComplete(response, json);
        }).bind(this);

        $super(url, options);
    },

    updateContent: function(responseText) {
        var receiver = this.container[this.success() ? 'success' : 'failure'],
            options = this.options;

        if (!options.evalScripts)
            responseText = responseText.stripScripts();

        if (receiver = $(receiver)) {
            if (options.insertion) {
                if (Object.isString(options.insertion)) {
                    var insertion = {};
                    insertion[options.insertion] = responseText;
                    receiver.insert(insertion);
                } else
                    options.insertion(receiver, responseText);
            } else
                receiver.update(responseText);
        }
    }
});

Ajax.PeriodicalUpdater = Class.create(Ajax.Base, {
    initialize: function($super, container, url, options) {
        $super(options);
        this.onComplete = this.options.onComplete;

        this.frequency = (this.options.frequency || 2);
        this.decay = (this.options.decay || 1);

        this.updater = {};
        this.container = container;
        this.url = url;

        this.start();
    },

    start: function() {
        this.options.onComplete = this.updateComplete.bind(this);
        this.onTimerEvent();
    },

    stop: function() {
        this.updater.options.onComplete = undefined;
        clearTimeout(this.timer);
        (this.onComplete || Prototype.emptyFunction).apply(this, arguments);
    },

    updateComplete: function(response) {
        if (this.options.decay) {
            this.decay = (response.responseText == this.lastText ? this.decay * this.options.decay : 1);

            this.lastText = response.responseText;
        }
        this.timer = this.onTimerEvent.bind(this).delay(this.decay * this.frequency);
    },

    onTimerEvent: function() {
        this.updater = new Ajax.Updater(this.container, this.url, this.options);
    }
});

(function(GLOBAL) {

    var UNDEFINED;
    var SLICE = Array.prototype.slice;

    var DIV = document.createElement('div');

    function $(element) {
        if (arguments.length > 1) {
            for (var i = 0, elements = [], length = arguments.length; i < length; i++)
                elements.push($(arguments[i]));
            return elements;
        }

        if (Object.isString(element))
            element = document.getElementById(element);
        return Element.extend(element);
    }


    GLOBAL.$ = $;

    if (!GLOBAL.Node)
        GLOBAL.Node = {};

    if (!GLOBAL.Node.ELEMENT_NODE) {
        Object.extend(GLOBAL.Node, {
            ELEMENT_NODE: 1,
            ATTRIBUTE_NODE: 2,
            TEXT_NODE: 3,
            CDATA_SECTION_NODE: 4,
            ENTITY_REFERENCE_NODE: 5,
            ENTITY_NODE: 6,
            PROCESSING_INSTRUCTION_NODE: 7,
            COMMENT_NODE: 8,
            DOCUMENT_NODE: 9,
            DOCUMENT_TYPE_NODE: 10,
            DOCUMENT_FRAGMENT_NODE: 11,
            NOTATION_NODE: 12
        });
    }

    var ELEMENT_CACHE = {};

    function shouldUseCreationCache(tagName, attributes) {
        if (tagName === 'select')
            return false;
        if ('type' in attributes)
            return false;
        return true;
    }

    var HAS_EXTENDED_CREATE_ELEMENT_SYNTAX = (function() {
        if (/(MSIE [0-9]{2,})/g.test(navigator.userAgent))
            return false;
        //IE FIX...
        try {
            var el = document.createElement('<input name="x">');
            return el.tagName.toLowerCase() === 'input' && el.name === 'x';
        } catch (err) {
            return false;
        }
    })();

    var oldElement = GLOBAL.Element;

    function Element(tagName, attributes) {
        attributes = attributes || {};
        tagName = tagName.toLowerCase();

        if (HAS_EXTENDED_CREATE_ELEMENT_SYNTAX && attributes.name) {
            tagName = '<' + tagName + ' name="' + attributes.name + '">';
            delete attributes.name;
            return Element.writeAttribute(document.createElement(tagName), attributes);
        }

        if (!ELEMENT_CACHE[tagName])
            ELEMENT_CACHE[tagName] = Element.extend(document.createElement(tagName));

        var node = shouldUseCreationCache(tagName, attributes) ? ELEMENT_CACHE[tagName].cloneNode(false) : document.createElement(tagName);

        return Element.writeAttribute(node, attributes);
    }


    GLOBAL.Element = Element;

    Object.extend(GLOBAL.Element, oldElement || {});
    if (oldElement)
        GLOBAL.Element.prototype = oldElement.prototype;

    Element.Methods = {
        ByTag: {},
        Simulated: {}
    };

    var methods = {};

    var INSPECT_ATTRIBUTES = {
        id: 'id',
        className: 'class'
    };

    function inspect(element) {
        element = $(element);
        var result = '<' + element.tagName.toLowerCase();

        var attribute, value;
        for (var property in INSPECT_ATTRIBUTES) {
            attribute = INSPECT_ATTRIBUTES[property];
            value = (element[property] || '').toString();
            if (value)
                result += ' ' + attribute + '=' + value.inspect(true);
        }

        return result + '>';
    }


    methods.inspect = inspect;

    function visible(element) {
        return $(element).style.display !== 'none';
    }

    function toggle(element, bool) {
        element = $(element);
        if (Object.isUndefined(bool))
            bool = !Element.visible(element);
        Element[bool ? 'show' : 'hide'](element);

        return element;
    }

    function hide(element) {
        element = $(element);
        element.style.display = 'none';
        return element;
    }

    function show(element) {
        element = $(element);
        element.style.display = '';
        return element;
    }


    Object.extend(methods, {
        visible: visible,
        toggle: toggle,
        hide: hide,
        show: show
    });

    function remove(element) {
        element = $(element);
        element.parentNode.removeChild(element);
        return element;
    }

    var SELECT_ELEMENT_INNERHTML_BUGGY = (function() {
        var el = document.createElement("select"),
            isBuggy = true;
        el.innerHTML = "<option value=\"test\">test</option>";
        if (el.options && el.options[0]) {
            isBuggy = el.options[0].nodeName.toUpperCase() !== "OPTION";
        }
        el = null;
        return isBuggy;
    })();

    var TABLE_ELEMENT_INNERHTML_BUGGY = (function() {
        try {
            var el = document.createElement("table");
            if (el && el.tBodies) {
                el.innerHTML = "<tbody><tr><td>test</td></tr></tbody>";
                var isBuggy = typeof el.tBodies[0] == "undefined";
                el = null;
                return isBuggy;
            }
        } catch (e) {
            return true;
        }
    })();

    var LINK_ELEMENT_INNERHTML_BUGGY = (function() {
        try {
            var el = document.createElement('div');
            el.innerHTML = "<link />";
            var isBuggy = (el.childNodes.length === 0);
            el = null;
            return isBuggy;
        } catch (e) {
            return true;
        }
    })();

    var ANY_INNERHTML_BUGGY = SELECT_ELEMENT_INNERHTML_BUGGY || TABLE_ELEMENT_INNERHTML_BUGGY || LINK_ELEMENT_INNERHTML_BUGGY;

    var SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING = (function() {
        var s = document.createElement("script"),
            isBuggy = false;
        try {
            s.appendChild(document.createTextNode(""));
            isBuggy = !s.firstChild || s.firstChild && s.firstChild.nodeType !== 3;
        } catch (e) {
            isBuggy = true;
        }
        s = null;
        return isBuggy;
    })();

    function update(element, content) {
        //console.log('Prototype.update', element);
        element = $(element);

        var descendants = element.getElementsByTagName('*'),
            i = descendants.length;
        while (i--) purgeElement(descendants[i]);

        if (content && content.toElement)
            content = content.toElement();

        if (Object.isElement(content))
            return element.update().insert(content);

        content = Object.toHTML(content);
        var tagName = element.tagName.toUpperCase();

        if (tagName === 'SCRIPT' && SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING) {
            element.text = content;
            return element;
        }

        if (ANY_INNERHTML_BUGGY) {
            if (tagName in INSERTION_TRANSLATIONS.tags) {
                while (element.firstChild)
                    element.removeChild(element.firstChild);

                var nodes = getContentFromAnonymousElement(tagName, content.stripScripts());
                for (var i = 0, node; node = nodes[i]; i++)
                    element.appendChild(node);

            } else if (LINK_ELEMENT_INNERHTML_BUGGY && Object.isString(content) && content.indexOf('<link') > -1) {
                while (element.firstChild)
                    element.removeChild(element.firstChild);

                var nodes = getContentFromAnonymousElement(tagName, content.stripScripts(), true);

                for (var i = 0, node; node = nodes[i]; i++)
                    element.appendChild(node);
            } else {
                element.innerHTML = content.stripScripts();
            }
        } else {
            element.innerHTML = content.stripScripts();
        }

        content.evalScripts.bind(content).defer();
        return element;
    }

    function updateSimple(element, content) {
        //console.log('Prototype.update', element);
        element = $(element);

        var descendants = element.getElementsByTagName('*'),
            i = descendants.length;
        while (i--) purgeElement(descendants[i]);

        if (content && content.toElement)
            content = content.toElement();

        if (Object.isElement(content))
            return element.update().insert(content);

        content = Object.toHTML(content);
        var tagName = element.tagName.toUpperCase();

        element.innerHTML = content;

        //content.evalScripts.bind(content).defer();
        return element;
    }

    function replace(element, content) {
        element = $(element);

        if (content && content.toElement) {
            content = content.toElement();
        } else if (!Object.isElement(content)) {
            content = Object.toHTML(content);
            var range = element.ownerDocument.createRange();
            range.selectNode(element);
            content.evalScripts.bind(content).defer();
            content = range.createContextualFragment(content.stripScripts());
        }

        element.parentNode.replaceChild(content, element);
        return element;
    }

    var INSERTION_TRANSLATIONS = {
        before: function(element, node) {
            element.parentNode.insertBefore(node, element);
        },
        top: function(element, node) {
            element.insertBefore(node, element.firstChild);
        },
        bottom: function(element, node) {
            element.appendChild(node);
        },
        after: function(element, node) {
            element.parentNode.insertBefore(node, element.nextSibling);
        },

        tags: {
            TABLE: ['<table>', '</table>', 1],
            TBODY: ['<table><tbody>', '</tbody></table>', 2],
            TR: ['<table><tbody><tr>', '</tr></tbody></table>', 3],
            TD: ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
            SELECT: ['<select>', '</select>', 1]
        }
    };

    var tags = INSERTION_TRANSLATIONS.tags;

    Object.extend(tags, {
        THEAD: tags.TBODY,
        TFOOT: tags.TBODY,
        TH: tags.TD
    });

    function replace_IE(element, content) {
        element = $(element);
        if (content && content.toElement)
            content = content.toElement();
        if (Object.isElement(content)) {
            element.parentNode.replaceChild(content, element);
            return element;
        }

        content = Object.toHTML(content);
        var parent = element.parentNode,
            tagName = parent.tagName.toUpperCase();

        if (tagName in INSERTION_TRANSLATIONS.tags) {
            var nextSibling = Element.next(element);
            var fragments = getContentFromAnonymousElement(tagName, content.stripScripts());

            parent.removeChild(element);

            var iterator;
            if (nextSibling)
                iterator = function(node) {
                    parent.insertBefore(node, nextSibling)
                };
            else
                iterator = function(node) {
                    parent.appendChild(node);
                }

            fragments.each(iterator);
        } else {
            element.outerHTML = content.stripScripts();
        }

        content.evalScripts.bind(content).defer();
        return element;
    }

    if ('outerHTML' in document.documentElement)
        replace = replace_IE;

    function isContent(content) {
        if (Object.isUndefined(content) || content === null)
            return false;

        if (Object.isString(content) || Object.isNumber(content))
            return true;
        if (Object.isElement(content))
            return true;
        if (content.toElement || content.toHTML)
            return true;

        return false;
    }

    function insertContentAt(element, content, position) {
        position = position.toLowerCase();
        var method = INSERTION_TRANSLATIONS[position];

        if (content && content.toElement)
            content = content.toElement();
        if (Object.isElement(content)) {
            method(element, content);
            return element;
        }

        content = Object.toHTML(content);
        var tagName = ((position === 'before' || position === 'after') ? element.parentNode : element).tagName.toUpperCase();

        var childNodes = getContentFromAnonymousElement(tagName, content.stripScripts());

        if (position === 'top' || position === 'after')
            childNodes.reverse();

        for (var i = 0, node; node = childNodes[i]; i++)
            method(element, node);

        content.evalScripts.bind(content).defer();
    }

    function insert(element, insertions) {
        element = $(element);

        if (isContent(insertions))
            insertions = {
                bottom: insertions
            };

        for (var position in insertions) insertContentAt(element, insertions[position], position);

        return element;
    }

    function insertContentAtSimple(element, content, position) {
        position = position.toLowerCase();
        var method = INSERTION_TRANSLATIONS[position];

        if (content && content.toElement)
            content = content.toElement();
        if (Object.isElement(content)) {
            method(element, content);
            return element;
        }

        content = Object.toHTML(content);
        var tagName = ((position === 'before' || position === 'after') ? element.parentNode : element).tagName.toUpperCase();

        var childNodes = getContentFromAnonymousElement(tagName, content);

        if (position === 'top' || position === 'after')
            childNodes.reverse();

        for (var i = 0, node; node = childNodes[i]; i++)
            method(element, node);

        //content.evalScripts.bind(content).defer();
    }

    function insertSimple(element, insertions) {
        element = $(element);

        if (isContent(insertions))
            insertions = {
                bottom: insertions
            };

        for (var position in insertions) insertContentAtSimple(element, insertions[position], position);

        return element;
    }

    function wrap(element, wrapper, attributes) {
        element = $(element);

        if (Object.isElement(wrapper)) {
            $(wrapper).writeAttribute(attributes || {});
        } else if (Object.isString(wrapper)) {
            wrapper = new Element(wrapper, attributes);
        } else {
            wrapper = new Element('div', wrapper);
        }

        if (element.parentNode)
            element.parentNode.replaceChild(wrapper, element);

        wrapper.appendChild(element);

        return wrapper;
    }

    function cleanWhitespace(element) {
        element = $(element);
        var node = element.firstChild;

        while (node) {
            var nextNode = node.nextSibling;
            if (node.nodeType === Node.TEXT_NODE && !/\S/.test(node.nodeValue))
                element.removeChild(node);
            node = nextNode;
        }
        return element;
    }

    function empty(element) {
        return $(element).innerHTML.blank();
    }

    function getContentFromAnonymousElement(tagName, html, force) {
        var t = INSERTION_TRANSLATIONS.tags[tagName],
            div = DIV;

        var workaround = !!t;
        if (!workaround && force) {
            workaround = true;
            t = ['', '', 0];
        }

        if (workaround) {
            div.innerHTML = '&#160;' + t[0] + html + t[1];
            div.removeChild(div.firstChild);
            for (var i = t[2]; i--;)
                div = div.firstChild;
        } else {
            div.innerHTML = html;
        }

        return $A(div.childNodes);
    }

    function clone(element, deep) {
        if (!(element = $(element)))
            return;
        var clone = element.cloneNode(deep);
        if (!HAS_UNIQUE_ID_PROPERTY) {
            clone._prototypeUID = UNDEFINED;
            if (deep) {
                var descendants = Element.select(clone, '*'),
                    i = descendants.length;
                while (i--)
                    descendants[i]._prototypeUID = UNDEFINED;
            }
        }
        return Element.extend(clone);
    }

    function purgeElement(element) {
        var uid = getUniqueElementID(element);
        if (uid) {
            Element.stopObserving(element);
            if (!HAS_UNIQUE_ID_PROPERTY)
                element._prototypeUID = UNDEFINED;
            delete Element.Storage[uid];
        }
    }

    function purgeCollection(elements) {
        var i = elements.length;
        while (i--) purgeElement(elements[i]);
    }

    function purgeCollection_IE(elements) {
        var i = elements.length,
            element, uid;
        while (i--) {
            element = elements[i];
            uid = getUniqueElementID(element);
            delete Element.Storage[uid];
            delete Event.cache[uid];
        }
    }

    if (HAS_UNIQUE_ID_PROPERTY) {
        purgeCollection = purgeCollection_IE;
    }

    function purge(element) {
        if (!(element = $(element)))
            return;
        purgeElement(element);

        var descendants = element.getElementsByTagName('*'),
            i = descendants.length;

        while (i--) purgeElement(descendants[i]);

        return null;
    }


    Object.extend(methods, {
        remove: remove,
        update: update,
        updateSimple: updateSimple,
        replace: replace,
        insert: insert,
        insertSimple: insertSimple,
        wrap: wrap,
        cleanWhitespace: cleanWhitespace,
        empty: empty,
        clone: clone,
        purge: purge
    });

    function recursivelyCollect(element, property, maximumLength) {
        element = $(element);
        maximumLength = maximumLength || -1;
        var elements = [];

        while (element = element[property]) {
            if (element.nodeType === Node.ELEMENT_NODE)
                elements.push(Element.extend(element));

            if (elements.length === maximumLength)
                break;
        }

        return elements;
    }

    function ancestors(element) {
        return recursivelyCollect(element, 'parentNode');
    }

    function descendants(element) {
        return Element.select(element, '*');
    }

    function firstDescendant(element) {
        element = $(element).firstChild;
        while (element && element.nodeType !== Node.ELEMENT_NODE)
            element = element.nextSibling;

        return $(element);
    }

    function immediateDescendants(element) {
        var results = [],
            child = $(element).firstChild;

        while (child) {
            if (child.nodeType === Node.ELEMENT_NODE)
                results.push(Element.extend(child));

            child = child.nextSibling;
        }

        return results;
    }

    function previousSiblings(element) {
        return recursivelyCollect(element, 'previousSibling');
    }

    function nextSiblings(element) {
        return recursivelyCollect(element, 'nextSibling');
    }

    function siblings(element) {
        element = $(element);
        var previous = previousSiblings(element),
            next = nextSiblings(element);
        return previous.reverse().concat(next);
    }

    function match(element, selector) {
        element = $(element);

        if (Object.isString(selector))
            return Prototype.Selector.match(element, selector);

        return selector.match(element);
    }

    function _recursivelyFind(element, property, expression, index) {
        element = $(element), expression = expression || 0, index = index || 0;
        if (Object.isNumber(expression)) {
            index = expression, expression = null;
        }

        while (element = element[property]) {
            if (element.nodeType !== 1)
                continue;
            if (expression && !Prototype.Selector.match(element, expression))
                continue;
            if (--index >= 0)
                continue;

            return Element.extend(element);
        }
    }

    function up(element, expression, index) {
        element = $(element);

        if (arguments.length === 1)
            return $(element.parentNode);
        return _recursivelyFind(element, 'parentNode', expression, index);
    }

    function down(element, expression, index) {
        element = $(element), expression = expression || 0, index = index || 0;

        if (Object.isNumber(expression))
            index = expression, expression = '*';

        var node = Prototype.Selector.select(expression, element)[index];
        return Element.extend(node);
    }

    function previous(element, expression, index) {
        return _recursivelyFind(element, 'previousSibling', expression, index);
    }

    function next(element, expression, index) {
        return _recursivelyFind(element, 'nextSibling', expression, index);
    }

    function select(element) {
        element = $(element);
        var expressions = SLICE.call(arguments, 1).join(', ');
        return Prototype.Selector.select(expressions, element);
    }

    function adjacent(element) {
        element = $(element);
        var expressions = SLICE.call(arguments, 1).join(', ');
        var siblings = Element.siblings(element),
            results = [];
        for (var i = 0, sibling; sibling = siblings[i]; i++) {
            if (Prototype.Selector.match(sibling, expressions))
                results.push(sibling);
        }

        return results;
    }

    function descendantOf_DOM(element, ancestor) {
        element = $(element), ancestor = $(ancestor);
        while (element = element.parentNode)
            if (element === ancestor)
                return true;
        return false;
    }

    function descendantOf_contains(element, ancestor) {
        element = $(element), ancestor = $(ancestor);
        if (!ancestor.contains)
            return descendantOf_DOM(element, ancestor);
        return ancestor.contains(element) && ancestor !== element;
    }

    function descendantOf_compareDocumentPosition(element, ancestor) {
        element = $(element), ancestor = $(ancestor);
        return (element.compareDocumentPosition(ancestor) & 8) === 8;
    }

    var descendantOf;
    if (DIV.compareDocumentPosition) {
        descendantOf = descendantOf_compareDocumentPosition;
    } else if (DIV.contains) {
        descendantOf = descendantOf_contains;
    } else {
        descendantOf = descendantOf_DOM;
    }

    Object.extend(methods, {
        recursivelyCollect: recursivelyCollect,
        ancestors: ancestors,
        descendants: descendants,
        firstDescendant: firstDescendant,
        immediateDescendants: immediateDescendants,
        previousSiblings: previousSiblings,
        nextSiblings: nextSiblings,
        siblings: siblings,
        match: match,
        up: up,
        down: down,
        previous: previous,
        next: next,
        select: select,
        adjacent: adjacent,
        descendantOf: descendantOf,

        getElementsBySelector: select,

        childElements: immediateDescendants
    });

    var idCounter = 1;

    function identify(element) {
        element = $(element);
        var id = Element.readAttribute(element, 'id');
        if (id)
            return id;

        do {
            id = 'anonymous_element_' + idCounter++
        } while ($(id));

        Element.writeAttribute(element, 'id', id);
        return id;
    }

    function readAttribute(element, name) {
        return $(element).getAttribute(name);
    }

    function readAttribute_IE(element, name) {
        element = $(element);

        var table = ATTRIBUTE_TRANSLATIONS.read;
        if (table.values[name])
            return table.values[name](element, name);

        if (table.names[name])
            name = table.names[name];

        if (name.include(':')) {
            if (!element.attributes || !element.attributes[name])
                return null;
            return element.attributes[name].value;
        }

        return element.getAttribute(name);
    }

    function readAttribute_Opera(element, name) {
        if (name === 'title')
            return element.title;
        return element.getAttribute(name);
    }

    var PROBLEMATIC_ATTRIBUTE_READING = (function() {
        if (/(MSIE [0-9]{2,})/g.test(navigator.userAgent))
            return false;
        //IE FIX...
        DIV.setAttribute('onclick', Prototype.emptyFunction);
        var value = DIV.getAttribute('onclick');
        var isFunction = (typeof value === 'function');
        DIV.removeAttribute('onclick');
        return isFunction;
    })();

    if (PROBLEMATIC_ATTRIBUTE_READING) {
        readAttribute = readAttribute_IE;
    } else if (Prototype.Browser.Opera) {
        readAttribute = readAttribute_Opera;
    }

    function writeAttribute(element, name, value) {
        element = $(element);
        var attributes = {},
            table = ATTRIBUTE_TRANSLATIONS.write;

        if (typeof name === 'object') {
            attributes = name;
        } else {
            attributes[name] = Object.isUndefined(value) ? true : value;
        }

        for (var attr in attributes) {
            name = table.names[attr] || attr;
            value = attributes[attr];
            if (table.values[attr])
                name = table.values[attr](element, value);
            if (value === false || value === null)
                element.removeAttribute(name);
            else if (value === true)
                element.setAttribute(name, name);
            else
                element.setAttribute(name, value);
        }

        return element;
    }

    function hasAttribute(element, attribute) {
        attribute = ATTRIBUTE_TRANSLATIONS.has[attribute] || attribute;
        var node = $(element).getAttribute(attribute);
        return !!(node && node.specified);
    }


    GLOBAL.Element.Methods.Simulated.hasAttribute = hasAttribute;

    function classNames(element) {
        return new Element.ClassNames(element);
    }

    var regExpCache = {};

    function getRegExpForClassName(className) {
        if (regExpCache[className])
            return regExpCache[className];

        var re = new RegExp("(^|\\s+)" + className + "(\\s+|$)");
        regExpCache[className] = re;
        return re;
    }

    function hasClassName(element, className) {

        if (!(element = $(element)))
            return;
        if (typeof(element.classList) != 'undefined') {
            return element.classList.contains(className);
        } else {
            var elementClassName = element.className;

            if (elementClassName.length === 0)
                return false;
            if (elementClassName === className)
                return true;
        }
        return getRegExpForClassName(className).test(elementClassName);
    }

    function addClassName(element, className) {
        if (typeof(className) == 'undefined' || typeof(className) != 'string' || className.length == 0) {
            return;
        }
        if (!(element = $(element)))
            return;

        if (typeof(element.classList) != 'undefined') {
            try {
                element.classList.add(className);
            } catch (e) {
                console.log("ERROR::::", className);
            }
        } else {
            if (!hasClassName(element, className))
                element.className += (element.className ? ' ' : '') + className;
        }
        return element;
    }

    function removeClassName(element, className) {
        if (typeof(className) == 'undefined' || typeof(className) != 'string' || className.length == 0) {
            return;
        }
        if (!(element = $(element)))
            return;
        if (typeof(element.classList) != 'undefined') {
            element.classList.remove(className);
        } else {
            element.className = element.className.replace(getRegExpForClassName(className), ' ').strip();
        }
        return element;
    }

    function toggleClassName(element, className, bool) {
        if (typeof(className) == 'undefined' || typeof(className) != 'string' || className.length == 0) {
            return;
        }
        if (!(element = $(element)))
            return;
        if (typeof(element.classList) != 'undefined') {
            element.classList.toggle(className);
            return element;
        } else {
            if (Object.isUndefined(bool))
                bool = !hasClassName(element, className);

            var method = Element[bool ? 'addClassName' : 'removeClassName'];
            return method(element, className);
        }
    }

    var ATTRIBUTE_TRANSLATIONS = {};

    var classProp = 'className',
        forProp = 'for';

    DIV.setAttribute(classProp, 'x');
    if (DIV.className !== 'x') {
        DIV.setAttribute('class', 'x');
        if (DIV.className === 'x')
            classProp = 'class';
    }

    var LABEL = document.createElement('label');
    LABEL.setAttribute(forProp, 'x');
    if (LABEL.htmlFor !== 'x') {
        LABEL.setAttribute('htmlFor', 'x');
        if (LABEL.htmlFor === 'x')
            forProp = 'htmlFor';
    }
    LABEL = null;

    function _getAttr(element, attribute) {
        return element.getAttribute(attribute);
    }

    function _getAttr2(element, attribute) {
        return element.getAttribute(attribute, 2);
    }

    function _getAttrNode(element, attribute) {
        var node = element.getAttributeNode(attribute);
        return node ? node.value : '';
    }

    function _getFlag(element, attribute) {
        return $(element).hasAttribute(attribute) ? attribute : null;
    }


    DIV.onclick = Prototype.emptyFunction;
    var onclickValue = DIV.getAttribute('onclick');

    var _getEv;

    if (String(onclickValue).indexOf('{') > -1) {
        _getEv = function(element, attribute) {
            var value = element.getAttribute(attribute);
            if (!value)
                return null;
            value = value.toString();
            value = value.split('{')[1];
            value = value.split('}')[0];
            return value.strip();
        };
    } else if (onclickValue === '') {
        _getEv = function(element, attribute) {
            var value = element.getAttribute(attribute);
            if (!value)
                return null;
            return value.strip();
        };
    }

    ATTRIBUTE_TRANSLATIONS.read = {
        names: {
            'class': classProp,
            'className': classProp,
            'for': forProp,
            'htmlFor': forProp
        },

        values: {
            style: function(element) {
                return element.style.cssText.toLowerCase();
            },
            title: function(element) {
                return element.title;
            }
        }
    };

    ATTRIBUTE_TRANSLATIONS.write = {
        names: {
            className: 'class',
            htmlFor: 'for',
            cellpadding: 'cellPadding',
            cellspacing: 'cellSpacing'
        },

        values: {
            checked: function(element, value) {
                element.checked = !!value;
            },

            style: function(element, value) {
                element.style.cssText = value ? value : '';
            }
        }
    };

    ATTRIBUTE_TRANSLATIONS.has = {
        names: {}
    };

    Object.extend(ATTRIBUTE_TRANSLATIONS.write.names, ATTRIBUTE_TRANSLATIONS.read.names);

    var CAMEL_CASED_ATTRIBUTE_NAMES = $w('colSpan rowSpan vAlign dateTime ' + 'accessKey tabIndex encType maxLength readOnly longDesc frameBorder');

    for (var i = 0, attr; attr = CAMEL_CASED_ATTRIBUTE_NAMES[i]; i++) {
        ATTRIBUTE_TRANSLATIONS.write.names[attr.toLowerCase()] = attr;
        ATTRIBUTE_TRANSLATIONS.has.names[attr.toLowerCase()] = attr;
    }

    Object.extend(ATTRIBUTE_TRANSLATIONS.read.values, {
        href: _getAttr2,
        src: _getAttr2,
        type: _getAttr,
        action: _getAttrNode,
        disabled: _getFlag,
        checked: _getFlag,
        readonly: _getFlag,
        multiple: _getFlag,
        onload: _getEv,
        onunload: _getEv,
        onclick: _getEv,
        ondblclick: _getEv,
        onmousedown: _getEv,
        onmouseup: _getEv,
        onmouseover: _getEv,
        onmousemove: _getEv,
        onmouseout: _getEv,
        onfocus: _getEv,
        onblur: _getEv,
        onkeypress: _getEv,
        onkeydown: _getEv,
        onkeyup: _getEv,
        onsubmit: _getEv,
        onreset: _getEv,
        onselect: _getEv,
        onchange: _getEv
    });

    Object.extend(methods, {
        identify: identify,
        readAttribute: readAttribute,
        writeAttribute: writeAttribute,
        classNames: classNames,
        hasClassName: hasClassName,
        addClassName: addClassName,
        removeClassName: removeClassName,
        toggleClassName: toggleClassName
    });

    function normalizeStyleName(style) {
        if (style === 'float' || style === 'styleFloat')
            return 'cssFloat';
        return style.camelize();
    }

    function normalizeStyleName_IE(style) {
        if (style === 'float' || style === 'cssFloat')
            return 'styleFloat';
        return style.camelize();
    }

    function setStyle(element, styles) {
        element = $(element);
        var elementStyle = element.style,
            match;

        if (Object.isString(styles)) {
            elementStyle.cssText += ';' + styles;
            if (styles.include('opacity')) {
                var opacity = styles.match(/opacity:\s*(\d?\.?\d*)/)[1];
                Element.setOpacity(element, opacity);
            }
            return element;
        }

        for (var property in styles) {
            if (property === 'opacity') {
                Element.setOpacity(element, styles[property]);
            } else {
                var value = styles[property];
                if (property === 'float' || property === 'cssFloat') {
                    property = Object.isUndefined(elementStyle.styleFloat) ? 'cssFloat' : 'styleFloat';
                }
                elementStyle[property] = value;
            }
        }

        return element;
    }

    function getStyle(element, style) {
        element = $(element);
        style = normalizeStyleName(style);

        var value = element.style[style];
        if (!value || value === 'auto') {
            var css = document.defaultView.getComputedStyle(element, null);
            value = css ? css[style] : null;
        }

        if (style === 'opacity')
            return value ? parseFloat(value) : 1.0;
        return value === 'auto' ? null : value;
    }

    function getStyle_Opera(element, style) {
        switch (style) {
            case 'height':
            case 'width':
                if (!Element.visible(element))
                    return null;

                var dim = parseInt(getStyle(element, style), 10);

                if (dim !== element['offset' + style.capitalize()])
                    return dim + 'px';

                return Element.measure(element, style);

            default:
                return getStyle(element, style);
        }
    }

    function getStyle_IE(element, style) {
        element = $(element);
        style = normalizeStyleName_IE(style);

        var value = element.style[style];
        if (!value && element.currentStyle) {
            value = element.currentStyle[style];
        }

        if (style === 'opacity' && !STANDARD_CSS_OPACITY_SUPPORTED)
            return getOpacity_IE(element);

        if (value === 'auto') {
            if ((style === 'width' || style === 'height') && Element.visible(element))
                return Element.measure(element, style) + 'px';
            return null;
        }

        return value;
    }

    function stripAlphaFromFilter_IE(filter) {
        return (filter || '').replace(/alpha\([^\)]*\)/gi, '');
    }

    function hasLayout_IE(element) {
        if (!element.currentStyle.hasLayout)
            element.style.zoom = 1;
        return element;
    }

    var STANDARD_CSS_OPACITY_SUPPORTED = (function() {
        DIV.style.cssText = "opacity:.55";
        return /^0.55/.test(DIV.style.opacity);
    })();

    function setOpacity(element, value) {
        element = $(element);
        if (value == 1 || value === '')
            value = '';
        else if (value < 0.00001)
            value = 0;
        element.style.opacity = value;
        return element;
    }

    function setOpacity_IE(element, value) {
        if (STANDARD_CSS_OPACITY_SUPPORTED)
            return setOpacity(element, value);

        element = hasLayout_IE($(element));
        var filter = Element.getStyle(element, 'filter'),
            style = element.style;

        if (value == 1 || value === '') {
            filter = stripAlphaFromFilter_IE(filter);
            if (filter)
                style.filter = filter;
            else
                style.removeAttribute('filter');
            return element;
        }

        if (value < 0.00001)
            value = 0;

        style.filter = stripAlphaFromFilter_IE(filter) + 'alpha(opacity=' + (value * 100) + ')';

        return element;
    }

    function getOpacity(element) {
        return Element.getStyle(element, 'opacity');
    }

    function getOpacity_IE(element) {
        if (STANDARD_CSS_OPACITY_SUPPORTED)
            return getOpacity(element);

        var filter = Element.getStyle(element, 'filter');
        if (filter.length === 0)
            return 1.0;
        var match = (filter || '').match(/alpha\(opacity=(.*)\)/);
        if (match[1])
            return parseFloat(match[1]) / 100;
        return 1.0;
    }


    Object.extend(methods, {
        setStyle: setStyle,
        getStyle: getStyle,
        setOpacity: setOpacity,
        getOpacity: getOpacity
    });

    if ('styleFloat' in DIV.style) {
        methods.getStyle = getStyle_IE;
        methods.setOpacity = setOpacity_IE;
        methods.getOpacity = getOpacity_IE;
    }

    var UID = 0;

    GLOBAL.Element.Storage = {
        UID: 1
    };

    function getUniqueElementID(element) {
        if (element === window)
            return 0;

        if (typeof element._prototypeUID === 'undefined')
            element._prototypeUID = Element.Storage.UID++;
        return element._prototypeUID;
    }

    function getUniqueElementID_IE(element) {
        if (element === window)
            return 0;
        if (element == document)
            return 1;
        return element.uniqueID;
    }

    var HAS_UNIQUE_ID_PROPERTY = ('uniqueID' in DIV);
    if (HAS_UNIQUE_ID_PROPERTY)
        getUniqueElementID = getUniqueElementID_IE;

    function getStorage(element) {
        if (!(element = $(element)))
            return;

        var uid = getUniqueElementID(element);

        if (!Element.Storage[uid])
            Element.Storage[uid] = $H();

        return Element.Storage[uid];
    }

    function store(element, key, value) {
        if (!(element = $(element)))
            return;
        var storage = getStorage(element);
        if (arguments.length === 2) {
            storage.update(key);
        } else {
            storage.set(key, value);
        }
        return element;
    }

    function retrieve(element, key, defaultValue) {
        if (!(element = $(element)))
            return;
        var storage = getStorage(element),
            value = storage.get(key);

        if (Object.isUndefined(value)) {
            storage.set(key, defaultValue);
            value = defaultValue;
        }

        return value;
    }


    Object.extend(methods, {
        getStorage: getStorage,
        store: store,
        retrieve: retrieve
    });

    var Methods = {},
        ByTag = Element.Methods.ByTag,
        F = Prototype.BrowserFeatures;

    if (!F.ElementExtensions && ('__proto__' in DIV)) {
        GLOBAL.HTMLElement = {};
        GLOBAL.HTMLElement.prototype = DIV['__proto__'];
        F.ElementExtensions = true;
    }

    function checkElementPrototypeDeficiency(tagName) {
        if (typeof window.Element === 'undefined')
            return false;
        var proto = window.Element.prototype;
        if (proto) {
            var id = '_' + (Math.random() + '').slice(2),
                el = document.createElement(tagName);
            proto[id] = 'x';
            var isBuggy = (el[id] !== 'x');
            delete proto[id];
            el = null;
            return isBuggy;
        }

        return false;
    }

    var HTMLOBJECTELEMENT_PROTOTYPE_BUGGY = checkElementPrototypeDeficiency('object');

    function extendElementWith(element, methods) {
        for (var property in methods) {
            var value = methods[property];
            if (Object.isFunction(value) && !(property in element))
                element[property] = value.methodize();
        }
    }

    var EXTENDED = {};

    function elementIsExtended(element) {
        var uid = getUniqueElementID(element);
        return (uid in EXTENDED);
    }

    function extend(element) {
        if (!element || elementIsExtended(element))
            return element;
        if (element.nodeType !== Node.ELEMENT_NODE || element == window)
            return element;

        var methods = Object.clone(Methods),
            tagName = element.tagName.toUpperCase();

        if (ByTag[tagName])
            Object.extend(methods, ByTag[tagName]);

        extendElementWith(element, methods);
        EXTENDED[getUniqueElementID(element)] = true;
        return element;
    }

    function extend_IE8(element) {
        if (!element || elementIsExtended(element))
            return element;

        var t = element.tagName;
        if (t && (/^(?:object|applet|embed)$/i.test(t))) {
            extendElementWith(element, Element.Methods);
            extendElementWith(element, Element.Methods.Simulated);
            extendElementWith(element, Element.Methods.ByTag[t.toUpperCase()]);
        }

        return element;
    }

    if (F.SpecificElementExtensions) {
        extend = HTMLOBJECTELEMENT_PROTOTYPE_BUGGY ? extend_IE8 : Prototype.K;
    }

    function addMethodsToTagName(tagName, methods) {
        tagName = tagName.toUpperCase();
        if (!ByTag[tagName])
            ByTag[tagName] = {};
        Object.extend(ByTag[tagName], methods);
    }

    function mergeMethods(destination, methods, onlyIfAbsent) {
        if (Object.isUndefined(onlyIfAbsent))
            onlyIfAbsent = false;
        for (var property in methods) {
            var value = methods[property];
            if (!Object.isFunction(value))
                continue;
            if (!onlyIfAbsent || !(property in destination))
                destination[property] = value.methodize();
        }
    }

    function findDOMClass(tagName) {
        var klass;
        var trans = {
            "OPTGROUP": "OptGroup",
            "TEXTAREA": "TextArea",
            "P": "Paragraph",
            "FIELDSET": "FieldSet",
            "UL": "UList",
            "OL": "OList",
            "DL": "DList",
            "DIR": "Directory",
            "H1": "Heading",
            "H2": "Heading",
            "H3": "Heading",
            "H4": "Heading",
            "H5": "Heading",
            "H6": "Heading",
            "Q": "Quote",
            "INS": "Mod",
            "DEL": "Mod",
            "A": "Anchor",
            "IMG": "Image",
            "CAPTION": "TableCaption",
            "COL": "TableCol",
            "COLGROUP": "TableCol",
            "THEAD": "TableSection",
            "TFOOT": "TableSection",
            "TBODY": "TableSection",
            "TR": "TableRow",
            "TH": "TableCell",
            "TD": "TableCell",
            "FRAMESET": "FrameSet",
            "IFRAME": "IFrame"
        };
        if (trans[tagName])
            klass = 'HTML' + trans[tagName] + 'Element';
        if (window[klass])
            return window[klass];
        klass = 'HTML' + tagName + 'Element';
        if (window[klass])
            return window[klass];
        klass = 'HTML' + tagName.capitalize() + 'Element';
        if (window[klass])
            return window[klass];

        var element = document.createElement(tagName),
            proto = element['__proto__'] || element.constructor.prototype;

        element = null;
        return proto;
    }

    function addMethods(methods) {
        if (arguments.length === 0)
            addFormMethods();

        if (arguments.length === 2) {
            var tagName = methods;
            methods = arguments[1];
        }

        if (!tagName) {
            Object.extend(Element.Methods, methods || {});
        } else {
            if (Object.isArray(tagName)) {
                for (var i = 0, tag; tag = tagName[i]; i++)
                    addMethodsToTagName(tag, methods);
            } else {
                addMethodsToTagName(tagName, methods);
            }
        }

        var ELEMENT_PROTOTYPE = window.HTMLElement ? HTMLElement.prototype : Element.prototype;

        if (F.ElementExtensions) {
            mergeMethods(ELEMENT_PROTOTYPE, Element.Methods);
            mergeMethods(ELEMENT_PROTOTYPE, Element.Methods.Simulated, true);
        }

        if (F.SpecificElementExtensions) {
            for (var tag in Element.Methods.ByTag) {
                var klass = findDOMClass(tag);
                if (Object.isUndefined(klass))
                    continue;
                mergeMethods(klass.prototype, ByTag[tag]);
            }
        }

        Object.extend(Element, Element.Methods);
        Object.extend(Element, Element.Methods.Simulated);
        delete Element.ByTag;
        delete Element.Simulated;

        Element.extend.refresh();

        ELEMENT_CACHE = {};
    }


    Object.extend(GLOBAL.Element, {
        extend: extend,
        addMethods: addMethods
    });

    if (extend === Prototype.K) {
        GLOBAL.Element.extend.refresh = Prototype.emptyFunction;
    } else {
        GLOBAL.Element.extend.refresh = function() {
            if (Prototype.BrowserFeatures.ElementExtensions)
                return;
            Object.extend(Methods, Element.Methods);
            Object.extend(Methods, Element.Methods.Simulated);

            EXTENDED = {};
        };
    }

    function addFormMethods() {
        Object.extend(Form, Form.Methods);
        Object.extend(Form.Element, Form.Element.Methods);
        Object.extend(Element.Methods.ByTag, {
            "FORM": Object.clone(Form.Methods),
            "INPUT": Object.clone(Form.Element.Methods),
            "SELECT": Object.clone(Form.Element.Methods),
            "TEXTAREA": Object.clone(Form.Element.Methods),
            "BUTTON": Object.clone(Form.Element.Methods)
        });
    }


    Element.addMethods(methods);

})(this);
(function() {

    function toDecimal(pctString) {
        var match = pctString.match(/^(\d+)%?$/i);
        if (!match)
            return null;
        return (Number(match[1]) / 100);
    }

    function getRawStyle(element, style) {
        element = $(element);

        var value = element.style[style];
        if (!value || value === 'auto') {
            var css = document.defaultView.getComputedStyle(element, null);
            value = css ? css[style] : null;
        }

        if (style === 'opacity')
            return value ? parseFloat(value) : 1.0;
        return value === 'auto' ? null : value;
    }

    function getRawStyle_IE(element, style) {
        var value = element.style[style];
        if (!value && element.currentStyle) {
            value = element.currentStyle[style];
        }
        return value;
    }

    function getContentWidth(element, context) {
        var boxWidth = element.offsetWidth;

        var bl = getPixelValue(element, 'borderLeftWidth', context) || 0;
        var br = getPixelValue(element, 'borderRightWidth', context) || 0;
        var pl = getPixelValue(element, 'paddingLeft', context) || 0;
        var pr = getPixelValue(element, 'paddingRight', context) || 0;

        return boxWidth - bl - br - pl - pr;
    }

    if ('currentStyle' in document.documentElement) {
        getRawStyle = getRawStyle_IE;
    }

    function getPixelValue(value, property, context) {
        var element = null;
        if (Object.isElement(value)) {
            element = value;
            value = getRawStyle(element, property);
        }

        if (value === null || Object.isUndefined(value)) {
            return null;
        }

        if ((/^(?:-)?\d+(\.\d+)?(px)?$/i).test(value)) {
            return window.parseFloat(value);
        }

        var isPercentage = value.include('%'),
            isViewport = (context === document.viewport);

        if (/\d/.test(value) && element && element.runtimeStyle && !(isPercentage && isViewport)) {
            var style = element.style.left,
                rStyle = element.runtimeStyle.left;
            element.runtimeStyle.left = element.currentStyle.left;
            element.style.left = value || 0;
            value = element.style.pixelLeft;
            element.style.left = style;
            element.runtimeStyle.left = rStyle;

            return value;
        }

        if (element && isPercentage) {
            context = context || element.parentNode;
            var decimal = toDecimal(value),
                whole = null;

            var isHorizontal = property.include('left') || property.include('right') || property.include('width');

            var isVertical = property.include('top') || property.include('bottom') || property.include('height');

            if (context === document.viewport) {
                if (isHorizontal) {
                    whole = document.viewport.getWidth();
                } else if (isVertical) {
                    whole = document.viewport.getHeight();
                }
            } else {
                if (isHorizontal) {
                    whole = $(context).measure('width');
                } else if (isVertical) {
                    whole = $(context).measure('height');
                }
            }

            return (whole === null) ? 0 : whole * decimal;
        }

        return 0;
    }

    function toCSSPixels(number) {
        if (Object.isString(number) && number.endsWith('px'))
            return number;
        return number + 'px';
    }

    function isDisplayed(element) {
        while (element && element.parentNode) {
            var display = element.getStyle('display');
            if (display === 'none') {
                return false;
            }
            element = $(element.parentNode);
        }
        return true;
    }

    var hasLayout = Prototype.K;
    if ('currentStyle' in document.documentElement) {
        hasLayout = function(element) {
            if (!element.currentStyle.hasLayout) {
                element.style.zoom = 1;
            }
            return element;
        };
    }

    function cssNameFor(key) {
        if (key.include('border'))
            key = key + '-width';
        return key.camelize();
    }


    Element.Layout = Class.create(Hash, {
        initialize: function($super, element, preCompute) {
            $super();
            this.element = $(element);

            Element.Layout.PROPERTIES.each(function(property) {
                this._set(property, null);
            }, this);

            if (preCompute) {
                this._preComputing = true;
                this._begin();
                Element.Layout.PROPERTIES.each(this._compute, this);
                this._end();
                this._preComputing = false;
            }
        },

        _set: function(property, value) {
            return Hash.prototype.set.call(this, property, value);
        },

        set: function(property, value) {
            throw "Properties of Element.Layout are read-only.";
        },

        get: function($super, property) {
            var value = $super(property);
            return value === null ? this._compute(property) : value;
        },

        _begin: function() {
            if (this._isPrepared())
                return;

            var element = this.element;
            if (isDisplayed(element)) {
                this._setPrepared(true);
                return;
            }

            var originalStyles = {
                position: element.style.position || '',
                width: element.style.width || '',
                visibility: element.style.visibility || '',
                display: element.style.display || ''
            };

            element.store('prototype_original_styles', originalStyles);

            var position = getRawStyle(element, 'position'),
                width = element.offsetWidth;

            if (width === 0 || width === null) {
                element.style.display = 'block';
                width = element.offsetWidth;
            }

            var context = (position === 'fixed') ? document.viewport : element.parentNode;

            var tempStyles = {
                visibility: 'hidden',
                display: 'block'
            };

            if (position !== 'fixed')
                tempStyles.position = 'absolute';

            element.setStyle(tempStyles);

            var positionedWidth = element.offsetWidth,
                newWidth;
            if (width && (positionedWidth === width)) {
                newWidth = getContentWidth(element, context);
            } else if (position === 'absolute' || position === 'fixed') {
                newWidth = getContentWidth(element, context);
            } else {
                var parent = element.parentNode,
                    pLayout = $(parent).getLayout();

                newWidth = pLayout.get('width') - this.get('margin-left') - this.get('border-left') - this.get('padding-left') - this.get('padding-right') - this.get('border-right') - this.get('margin-right');
            }

            element.setStyle({
                width: newWidth + 'px'
            });

            this._setPrepared(true);
        },

        _end: function() {
            var element = this.element;
            var originalStyles = element.retrieve('prototype_original_styles');
            element.store('prototype_original_styles', null);
            element.setStyle(originalStyles);
            this._setPrepared(false);
        },

        _compute: function(property) {
            var COMPUTATIONS = Element.Layout.COMPUTATIONS;
            if (!(property in COMPUTATIONS)) {
                throw "Property not found.";
            }

            return this._set(property, COMPUTATIONS[property].call(this, this.element));
        },

        _isPrepared: function() {
            return this.element.retrieve('prototype_element_layout_prepared', false);
        },

        _setPrepared: function(bool) {
            return this.element.store('prototype_element_layout_prepared', bool);
        },

        toObject: function() {
            var args = $A(arguments);
            var keys = (args.length === 0) ? Element.Layout.PROPERTIES : args.join(' ').split(' ');
            var obj = {};
            keys.each(function(key) {
                if (!Element.Layout.PROPERTIES.include(key))
                    return;
                var value = this.get(key);
                if (value != null)
                    obj[key] = value;
            }, this);
            return obj;
        },

        toHash: function() {
            var obj = this.toObject.apply(this, arguments);
            return new Hash(obj);
        },

        toCSS: function() {
            var args = $A(arguments);
            var keys = (args.length === 0) ? Element.Layout.PROPERTIES : args.join(' ').split(' ');
            var css = {};

            keys.each(function(key) {
                if (!Element.Layout.PROPERTIES.include(key))
                    return;
                if (Element.Layout.COMPOSITE_PROPERTIES.include(key))
                    return;

                var value = this.get(key);
                if (value != null)
                    css[cssNameFor(key)] = value + 'px';
            }, this);
            return css;
        },

        inspect: function() {
            return "#<Element.Layout>";
        }
    });

    Object.extend(Element.Layout, {
        PROPERTIES: $w('height width top left right bottom border-left border-right border-top border-bottom padding-left padding-right padding-top padding-bottom margin-top margin-bottom margin-left margin-right padding-box-width padding-box-height border-box-width border-box-height margin-box-width margin-box-height'),

        COMPOSITE_PROPERTIES: $w('padding-box-width padding-box-height margin-box-width margin-box-height border-box-width border-box-height'),

        COMPUTATIONS: {
            'height': function(element) {
                if (!this._preComputing)
                    this._begin();

                var bHeight = this.get('border-box-height');
                if (bHeight <= 0) {
                    if (!this._preComputing)
                        this._end();
                    return 0;
                }

                var bTop = this.get('border-top'),
                    bBottom = this.get('border-bottom');

                var pTop = this.get('padding-top'),
                    pBottom = this.get('padding-bottom');

                if (!this._preComputing)
                    this._end();

                return bHeight - bTop - bBottom - pTop - pBottom;
            },

            'width': function(element) {
                if (!this._preComputing)
                    this._begin();

                var bWidth = this.get('border-box-width');
                if (bWidth <= 0) {
                    if (!this._preComputing)
                        this._end();
                    return 0;
                }

                var bLeft = this.get('border-left'),
                    bRight = this.get('border-right');

                var pLeft = this.get('padding-left'),
                    pRight = this.get('padding-right');

                if (!this._preComputing)
                    this._end();
                return bWidth - bLeft - bRight - pLeft - pRight;
            },

            'padding-box-height': function(element) {
                var height = this.get('height'),
                    pTop = this.get('padding-top'),
                    pBottom = this.get('padding-bottom');

                return height + pTop + pBottom;
            },

            'padding-box-width': function(element) {
                var width = this.get('width'),
                    pLeft = this.get('padding-left'),
                    pRight = this.get('padding-right');

                return width + pLeft + pRight;
            },

            'border-box-height': function(element) {
                if (!this._preComputing)
                    this._begin();
                var height = element.offsetHeight;
                if (!this._preComputing)
                    this._end();
                return height;
            },

            'border-box-width': function(element) {
                if (!this._preComputing)
                    this._begin();
                var width = element.offsetWidth;
                if (!this._preComputing)
                    this._end();
                return width;
            },

            'margin-box-height': function(element) {
                var bHeight = this.get('border-box-height'),
                    mTop = this.get('margin-top'),
                    mBottom = this.get('margin-bottom');

                if (bHeight <= 0)
                    return 0;

                return bHeight + mTop + mBottom;
            },

            'margin-box-width': function(element) {
                var bWidth = this.get('border-box-width'),
                    mLeft = this.get('margin-left'),
                    mRight = this.get('margin-right');

                if (bWidth <= 0)
                    return 0;

                return bWidth + mLeft + mRight;
            },

            'top': function(element) {
                var offset = element.positionedOffset();
                return offset.top;
            },

            'bottom': function(element) {
                var offset = element.positionedOffset(),
                    parent = element.getOffsetParent(),
                    pHeight = parent.measure('height');

                var mHeight = this.get('border-box-height');

                return pHeight - mHeight - offset.top;
            },

            'left': function(element) {
                var offset = element.positionedOffset();
                return offset.left;
            },

            'right': function(element) {
                var offset = element.positionedOffset(),
                    parent = element.getOffsetParent(),
                    pWidth = parent.measure('width');

                var mWidth = this.get('border-box-width');

                return pWidth - mWidth - offset.left;
            },

            'padding-top': function(element) {
                return getPixelValue(element, 'paddingTop');
            },

            'padding-bottom': function(element) {
                return getPixelValue(element, 'paddingBottom');
            },

            'padding-left': function(element) {
                return getPixelValue(element, 'paddingLeft');
            },

            'padding-right': function(element) {
                return getPixelValue(element, 'paddingRight');
            },

            'border-top': function(element) {
                return getPixelValue(element, 'borderTopWidth');
            },

            'border-bottom': function(element) {
                return getPixelValue(element, 'borderBottomWidth');
            },

            'border-left': function(element) {
                return getPixelValue(element, 'borderLeftWidth');
            },

            'border-right': function(element) {
                return getPixelValue(element, 'borderRightWidth');
            },

            'margin-top': function(element) {
                return getPixelValue(element, 'marginTop');
            },

            'margin-bottom': function(element) {
                return getPixelValue(element, 'marginBottom');
            },

            'margin-left': function(element) {
                return getPixelValue(element, 'marginLeft');
            },

            'margin-right': function(element) {
                return getPixelValue(element, 'marginRight');
            }
        }
    });

    if ('getBoundingClientRect' in document.documentElement) {
        Object.extend(Element.Layout.COMPUTATIONS, {
            'right': function(element) {
                var parent = hasLayout(element.getOffsetParent());
                var rect = element.getBoundingClientRect(),
                    pRect = parent.getBoundingClientRect();

                return (pRect.right - rect.right).round();
            },

            'bottom': function(element) {
                var parent = hasLayout(element.getOffsetParent());
                var rect = element.getBoundingClientRect(),
                    pRect = parent.getBoundingClientRect();

                return (pRect.bottom - rect.bottom).round();
            }
        });
    }

    Element.Offset = Class.create({
        initialize: function(left, top) {
            this.left = left.round();
            this.top = top.round();

            this[0] = this.left;
            this[1] = this.top;
        },

        relativeTo: function(offset) {
            return new Element.Offset(this.left - offset.left, this.top - offset.top);
        },

        inspect: function() {
            return "#<Element.Offset left: #{left} top: #{top}>".interpolate(this);
        },

        toString: function() {
            return "[#{left}, #{top}]".interpolate(this);
        },

        toArray: function() {
            return [this.left, this.top];
        }
    });

    function getLayout(element, preCompute) {
        return new Element.Layout(element, preCompute);
    }

    function measure(element, property) {
        return $(element).getLayout().get(property);
    }

    function getHeight(element) {
        return Element.getDimensions(element).height;
    }

    function getWidth(element) {
        return Element.getDimensions(element).width;
    }

    function getDimensions(element) {
        element = $(element);
        var display = Element.getStyle(element, 'display');

        if (display && display !== 'none') {
            return {
                width: element.offsetWidth,
                height: element.offsetHeight
            };
        }

        var style = element.style;
        var originalStyles = {
            visibility: style.visibility,
            position: style.position,
            display: style.display
        };

        var newStyles = {
            visibility: 'hidden',
            display: 'block'
        };

        if (originalStyles.position !== 'fixed')
            newStyles.position = 'absolute';

        Element.setStyle(element, newStyles);

        var dimensions = {
            width: element.offsetWidth,
            height: element.offsetHeight
        };

        Element.setStyle(element, originalStyles);

        return dimensions;
    }

    function getOffsetParent(element) {
        element = $(element);

        if (isDocument(element) || isDetached(element) || isBody(element) || isHtml(element))
            return $(document.body);

        var isInline = (Element.getStyle(element, 'display') === 'inline');
        if (!isInline && element.offsetParent)
            return $(element.offsetParent);

        while ((element = element.parentNode) && element !== document.body) {
            if (Element.getStyle(element, 'position') !== 'static') {
                return isHtml(element) ? $(document.body) : $(element);
            }
        }

        return $(document.body);
    }

    function cumulativeOffset(element) {
        element = $(element);
        var valueT = 0,
            valueL = 0;
        if (element.parentNode) {
            do {
                valueT += element.offsetTop || 0;
                valueL += element.offsetLeft || 0;
                element = element.offsetParent;
            } while (element);
        }
        return new Element.Offset(valueL, valueT);
    }

    function positionedOffset(element) {
        element = $(element);

        var layout = element.getLayout();

        var valueT = 0,
            valueL = 0;
        do {
            valueT += element.offsetTop || 0;
            valueL += element.offsetLeft || 0;
            element = element.offsetParent;
            if (element) {
                if (isBody(element))
                    break;
                var p = Element.getStyle(element, 'position');
                if (p !== 'static')
                    break;
            }
        } while (element);

        valueL -= layout.get('margin-top');
        valueT -= layout.get('margin-left');

        return new Element.Offset(valueL, valueT);
    }

    function cumulativeScrollOffset(element) {
        var valueT = 0,
            valueL = 0;
        do {
            valueT += element.scrollTop || 0;
            valueL += element.scrollLeft || 0;
            element = element.parentNode;
        } while (element);
        return new Element.Offset(valueL, valueT);
    }

    function viewportOffset(forElement) {
        var valueT = 0,
            valueL = 0,
            docBody = document.body;

        var element = $(forElement);
        do {
            valueT += element.offsetTop || 0;
            valueL += element.offsetLeft || 0;
            if (element.offsetParent == docBody && Element.getStyle(element, 'position') == 'absolute')
                break;
        } while (element = element.offsetParent);

        element = forElement;
        do {
            if (element != docBody) {
                valueT -= element.scrollTop || 0;
                valueL -= element.scrollLeft || 0;
            }
        } while (element = element.parentNode);
        return new Element.Offset(valueL, valueT);
    }

    function absolutize(element) {
        element = $(element);

        if (Element.getStyle(element, 'position') === 'absolute') {
            return element;
        }

        var offsetParent = getOffsetParent(element);
        var eOffset = element.viewportOffset(),
            pOffset = offsetParent.viewportOffset();

        var offset = eOffset.relativeTo(pOffset);
        var layout = element.getLayout();

        element.store('prototype_absolutize_original_styles', {
            left: element.getStyle('left'),
            top: element.getStyle('top'),
            width: element.getStyle('width'),
            height: element.getStyle('height')
        });

        element.setStyle({
            position: 'absolute',
            top: offset.top + 'px',
            left: offset.left + 'px',
            width: layout.get('width') + 'px',
            height: layout.get('height') + 'px'
        });

        return element;
    }

    function relativize(element) {
        element = $(element);
        if (Element.getStyle(element, 'position') === 'relative') {
            return element;
        }

        var originalStyles = element.retrieve('prototype_absolutize_original_styles');

        if (originalStyles)
            element.setStyle(originalStyles);
        return element;
    }

    function scrollTo(element) {
        element = $(element);
        var pos = Element.cumulativeOffset(element);
        window.scrollTo(pos.left, pos.top);
        return element;
    }

    function makePositioned(element) {
        element = $(element);
        var position = Element.getStyle(element, 'position'),
            styles = {};
        if (position === 'static' || !position) {
            styles.position = 'relative';
            if (Prototype.Browser.Opera) {
                styles.top = 0;
                styles.left = 0;
            }
            Element.setStyle(element, styles);
            Element.store(element, 'prototype_made_positioned', true);
        }
        return element;
    }

    function undoPositioned(element) {
        element = $(element);
        var storage = Element.getStorage(element),
            madePositioned = storage.get('prototype_made_positioned');

        if (madePositioned) {
            storage.unset('prototype_made_positioned');
            Element.setStyle(element, {
                position: '',
                top: '',
                bottom: '',
                left: '',
                right: ''
            });
        }
        return element;
    }

    function makeClipping(element) {
        element = $(element);

        var storage = Element.getStorage(element),
            madeClipping = storage.get('prototype_made_clipping');

        if (Object.isUndefined(madeClipping)) {
            var overflow = Element.getStyle(element, 'overflow');
            storage.set('prototype_made_clipping', overflow);
            if (overflow !== 'hidden')
                element.style.overflow = 'hidden';
        }

        return element;
    }

    function undoClipping(element) {
        element = $(element);
        var storage = Element.getStorage(element),
            overflow = storage.get('prototype_made_clipping');

        if (!Object.isUndefined(overflow)) {
            storage.unset('prototype_made_clipping');
            element.style.overflow = overflow || '';
        }

        return element;
    }

    function clonePosition(element, source, options) {
        options = Object.extend({
            setLeft: true,
            setTop: true,
            setWidth: true,
            setHeight: true,
            offsetTop: 0,
            offsetLeft: 0
        }, options || {});

        source = $(source);
        element = $(element);
        var p, delta, layout, styles = {};

        if (options.setLeft || options.setTop) {
            p = Element.viewportOffset(source);
            delta = [0, 0];
            if (Element.getStyle(element, 'position') === 'absolute') {
                var parent = Element.getOffsetParent(element);
                if (parent !== document.body)
                    delta = Element.viewportOffset(parent);
            }
        }

        if (options.setWidth || options.setHeight) {
            layout = Element.getLayout(source);
        }

        if (options.setLeft)
            styles.left = (p[0] - delta[0] + options.offsetLeft) + 'px';
        if (options.setTop)
            styles.top = (p[1] - delta[1] + options.offsetTop) + 'px';

        if (options.setWidth)
            styles.width = layout.get('border-box-width') + 'px';
        if (options.setHeight)
            styles.height = layout.get('border-box-height') + 'px';

        return Element.setStyle(element, styles);
    }

    if (Prototype.Browser.IE) {
        getOffsetParent = getOffsetParent.wrap(function(proceed, element) {
            element = $(element);

            if (isDocument(element) || isDetached(element) || isBody(element) || isHtml(element))
                return $(document.body);

            var position = element.getStyle('position');
            if (position !== 'static')
                return proceed(element);

            element.setStyle({
                position: 'relative'
            });
            var value = proceed(element);
            element.setStyle({
                position: position
            });
            return value;
        });

        positionedOffset = positionedOffset.wrap(function(proceed, element) {
            element = $(element);
            if (!element.parentNode)
                return new Element.Offset(0, 0);
            var position = element.getStyle('position');
            if (position !== 'static')
                return proceed(element);

            var offsetParent = element.getOffsetParent();
            if (offsetParent && offsetParent.getStyle('position') === 'fixed')
                hasLayout(offsetParent);

            element.setStyle({
                position: 'relative'
            });
            var value = proceed(element);
            element.setStyle({
                position: position
            });
            return value;
        });
    } else if (Prototype.Browser.Webkit) {
        cumulativeOffset = function(element) {
            element = $(element);
            var valueT = 0,
                valueL = 0;
            do {
                valueT += element.offsetTop || 0;
                valueL += element.offsetLeft || 0;
                if (element.offsetParent == document.body) {
                    if (Element.getStyle(element, 'position') == 'absolute')
                        break;
                }

                element = element.offsetParent;
            } while (element);

            return new Element.Offset(valueL, valueT);
        };
    }

    Element.addMethods({
        getLayout: getLayout,
        measure: measure,
        getWidth: getWidth,
        getHeight: getHeight,
        getDimensions: getDimensions,
        getOffsetParent: getOffsetParent,
        cumulativeOffset: cumulativeOffset,
        positionedOffset: positionedOffset,
        cumulativeScrollOffset: cumulativeScrollOffset,
        viewportOffset: viewportOffset,
        absolutize: absolutize,
        relativize: relativize,
        scrollTo: scrollTo,
        makePositioned: makePositioned,
        undoPositioned: undoPositioned,
        makeClipping: makeClipping,
        undoClipping: undoClipping,
        clonePosition: clonePosition
    });

    function isBody(element) {
        return element.nodeName.toUpperCase() === 'BODY';
    }

    function isHtml(element) {
        return element.nodeName.toUpperCase() === 'HTML';
    }

    function isDocument(element) {
        return element.nodeType === Node.DOCUMENT_NODE;
    }

    function isDetached(element) {
        return element !== document.body && !Element.descendantOf(element, document.body);
    }

    if ('getBoundingClientRect' in document.documentElement) {
        Element.addMethods({
            viewportOffset: function(element) {
                element = $(element);
                if (isDetached(element))
                    return new Element.Offset(0, 0);

                var rect = element.getBoundingClientRect(),
                    docEl = document.documentElement;
                return new Element.Offset(rect.left - docEl.clientLeft, rect.top - docEl.clientTop);
            }
        });
    }

})();

(function() {

    var IS_OLD_OPERA = Prototype.Browser.Opera && window.hasOwnProperty('opera') && (window.parseFloat(window.opera.version()) < 9.5);
    var ROOT = null;

    function getRootElement() {
        if (ROOT)
            return ROOT;
        ROOT = IS_OLD_OPERA ? document.body : document.documentElement;
        return ROOT;
    }

    function getDimensions() {
        return {
            width: this.getWidth(),
            height: this.getHeight()
        };
    }

    function getWidth() {
        return getRootElement().clientWidth;
    }

    function getHeight() {
        return getRootElement().clientHeight;
    }

    function getScrollOffsets() {
        var x = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft;
        var y = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;

        return new Element.Offset(x, y);
    }


    document.viewport = {
        getDimensions: getDimensions,
        getWidth: getWidth,
        getHeight: getHeight,
        getScrollOffsets: getScrollOffsets
    };

})();
window.$$ = function() {
    var expression = $A(arguments).join(', ');
    return Prototype.Selector.select(expression, document);
};

Prototype.Selector = (function() {

    function select() {
        throw new Error('Method "Prototype.Selector.select" must be defined.');
    }

    function match() {
        throw new Error('Method "Prototype.Selector.match" must be defined.');
    }

    function find(elements, expression, index) {
        index = index || 0;
        var match = Prototype.Selector.match,
            length = elements.length,
            matchIndex = 0,
            i;

        for (i = 0; i < length; i++) {
            if (match(elements[i], expression) && index == matchIndex++) {
                return Element.extend(elements[i]);
            }
        }
    }

    function extendElements(elements) {
        for (var i = 0, length = elements.length; i < length; i++) {
            Element.extend(elements[i]);
        }
        return elements;
    }

    var K = Prototype.K;

    return {
        select: select,
        match: match,
        find: find,
        extendElements: (Element.extend === K) ? K : extendElements,
        extendElement: Element.extend
    };
})();

/*!
 * Sizzle CSS Selector Engine v@VERSION
 * http://sizzlejs.com/
 *
 * Copyright 2013 jQuery Foundation, Inc. and other contributors
 * Released under the MIT license
 * http://jquery.org/license
 *
 * Date: @DATE
 */
! function(a) {
    var b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t = "sizzle" + -new Date,
        u = a.document,
        v = 0,
        w = 0,
        x = fb(),
        y = fb(),
        z = fb(),
        A = function(a, b) {
            return a === b && (k = !0), 0
        },
        B = "undefined",
        C = 1 << 31,
        D = {}.hasOwnProperty,
        E = [],
        F = E.pop,
        G = E.push,
        H = E.push,
        I = E.slice,
        J = E.indexOf || function(a) {
            for (var b = 0, c = this.length; c > b; b++)
                if (this[b] === a) return b;
            return -1
        },
        K = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",
        L = "[\\x20\\t\\r\\n\\f]",
        M = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",
        N = M.replace("w", "w#"),
        O = "\\[" + L + "*(" + M + ")" + L + "*(?:([*^$|!~]?=)" + L + "*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|(" + N + ")|)|)" + L + "*\\]",
        P = ":(" + M + ")(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|" + O.replace(3, 8) + ")*)|.*)\\)|)",
        Q = new RegExp("^" + L + "+|((?:^|[^\\\\])(?:\\\\.)*)" + L + "+$", "g"),
        R = new RegExp("^" + L + "*," + L + "*"),
        S = new RegExp("^" + L + "*([>+~]|" + L + ")" + L + "*"),
        T = new RegExp("=" + L + "*([^\\]'\"]*?)" + L + "*\\]", "g"),
        U = new RegExp(P),
        V = new RegExp("^" + N + "$"),
        W = {
            ID: new RegExp("^#(" + M + ")"),
            CLASS: new RegExp("^\\.(" + M + ")"),
            TAG: new RegExp("^(" + M.replace("w", "w*") + ")"),
            ATTR: new RegExp("^" + O),
            PSEUDO: new RegExp("^" + P),
            CHILD: new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + L + "*(even|odd|(([+-]|)(\\d*)n|)" + L + "*(?:([+-]|)" + L + "*(\\d+)|))" + L + "*\\)|)", "i"),
            bool: new RegExp("^(?:" + K + ")$", "i"),
            needsContext: new RegExp("^" + L + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + L + "*((?:-\\d)?\\d*)" + L + "*\\)|)(?=[^-]|$)", "i")
        },
        X = /^(?:input|select|textarea|button)$/i,
        Y = /^h\d$/i,
        Z = /^[^{]+\{\s*\[native \w/,
        $ = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,
        _ = /[+~]/,
        ab = /'|\\/g,
        bb = new RegExp("\\\\([\\da-f]{1,6}" + L + "?|(" + L + ")|.)", "ig"),
        cb = function(a, b, c) {
            var d = "0x" + b - 65536;
            return d !== d || c ? b : 0 > d ? String.fromCharCode(d + 65536) : String.fromCharCode(d >> 10 | 55296, 1023 & d | 56320)
        };
    try {
        H.apply(E = I.call(u.childNodes), u.childNodes), E[u.childNodes.length].nodeType
    } catch (db) {
        H = {
            apply: E.length ? function(a, b) {
                G.apply(a, I.call(b))
            } : function(a, b) {
                var c = a.length,
                    d = 0;
                while (a[c++] = b[d++]);
                a.length = c - 1
            }
        }
    }

    function eb(a, b, d, e) {
        var f, g, i, j, k, n, q, r, v, w;
        if ((b ? b.ownerDocument || b : u) !== m && l(b), b = b || m, d = d || [], !a || "string" != typeof a) return d;
        if (1 !== (j = b.nodeType) && 9 !== j) return [];
        if (o && !e) {
            if (f = $.exec(a))
                if (i = f[1]) {
                    if (9 === j) {
                        if (g = b.getElementById(i), !g || !g.parentNode) return d;
                        if (g.id === i) return d.push(g), d
                    } else if (b.ownerDocument && (g = b.ownerDocument.getElementById(i)) && s(b, g) && g.id === i) return d.push(g), d
                } else {
                    if (f[2]) return H.apply(d, b.getElementsByTagName(a)), d;
                    if ((i = f[3]) && c.getElementsByClassName && b.getElementsByClassName) return H.apply(d, b.getElementsByClassName(i)), d
                }
            if (c.qsa && (!p || !p.test(a))) {
                if (r = q = t, v = b, w = 9 === j && a, 1 === j && "object" !== b.nodeName.toLowerCase()) {
                    n = pb(a), (q = b.getAttribute("id")) ? r = q.replace(ab, "\\$&") : b.setAttribute("id", r), r = "[id='" + r + "'] ", k = n.length;
                    while (k--) n[k] = r + qb(n[k]);
                    v = _.test(a) && nb(b.parentNode) || b, w = n.join(",")
                }
                if (w) try {
                    return H.apply(d, v.querySelectorAll(w)), d
                } catch (x) {} finally {
                    q || b.removeAttribute("id")
                }
            }
        }
        return h(a.replace(Q, "$1"), b, d, e)
    }

    function fb() {
        var a = [];

        function b(c, e) {
            return a.push(c + " ") > d.cacheLength && delete b[a.shift()], b[c + " "] = e
        }
        return b
    }

    function gb(a) {
        return a[t] = !0, a
    }

    function hb(a) {
        var b = m.createElement("div");
        try {
            return !!a(b)
        } catch (c) {
            return !1
        } finally {
            b.parentNode && b.parentNode.removeChild(b), b = null
        }
    }

    function ib(a, b) {
        var c = a.split("|"),
            e = a.length;
        while (e--) d.attrHandle[c[e]] = b
    }

    function jb(a, b) {
        var c = b && a,
            d = c && 1 === a.nodeType && 1 === b.nodeType && (~b.sourceIndex || C) - (~a.sourceIndex || C);
        if (d) return d;
        if (c)
            while (c = c.nextSibling)
                if (c === b) return -1;
        return a ? 1 : -1
    }

    function kb(a) {
        return function(b) {
            var c = b.nodeName.toLowerCase();
            return "input" === c && b.type === a
        }
    }

    function lb(a) {
        return function(b) {
            var c = b.nodeName.toLowerCase();
            return ("input" === c || "button" === c) && b.type === a
        }
    }

    function mb(a) {
        return gb(function(b) {
            return b = +b, gb(function(c, d) {
                var e, f = a([], c.length, b),
                    g = f.length;
                while (g--) c[e = f[g]] && (c[e] = !(d[e] = c[e]))
            })
        })
    }

    function nb(a) {
        return a && typeof a.getElementsByTagName !== B && a
    }
    c = eb.support = {}, f = eb.isXML = function(a) {
        var b = a && (a.ownerDocument || a).documentElement;
        return b ? "HTML" !== b.nodeName : !1
    }, l = eb.setDocument = function(a) {
        var b, e = a ? a.ownerDocument || a : u,
            g = e.defaultView;
        return e !== m && 9 === e.nodeType && e.documentElement ? (m = e, n = e.documentElement, o = !f(e), g && g !== g.top && (g.addEventListener ? g.addEventListener("unload", function() {
            l()
        }, !1) : g.attachEvent && g.attachEvent("onunload", function() {
            l()
        })), c.attributes = hb(function(a) {
            return a.className = "i", !a.getAttribute("className")
        }), c.getElementsByTagName = hb(function(a) {
            return a.appendChild(e.createComment("")), !a.getElementsByTagName("*").length
        }), c.getElementsByClassName = Z.test(e.getElementsByClassName) && hb(function(a) {
            return a.innerHTML = "<div class='a'></div><div class='a i'></div>", a.firstChild.className = "i", 2 === a.getElementsByClassName("i").length
        }), c.getById = hb(function(a) {
            return n.appendChild(a).id = t, !e.getElementsByName || !e.getElementsByName(t).length
        }), c.getById ? (d.find.ID = function(a, b) {
            if (typeof b.getElementById !== B && o) {
                var c = b.getElementById(a);
                return c && c.parentNode ? [c] : []
            }
        }, d.filter.ID = function(a) {
            var b = a.replace(bb, cb);
            return function(a) {
                return a.getAttribute("id") === b
            }
        }) : (delete d.find.ID, d.filter.ID = function(a) {
            var b = a.replace(bb, cb);
            return function(a) {
                var c = typeof a.getAttributeNode !== B && a.getAttributeNode("id");
                return c && c.value === b
            }
        }), d.find.TAG = c.getElementsByTagName ? function(a, b) {
            return typeof b.getElementsByTagName !== B ? b.getElementsByTagName(a) : void 0
        } : function(a, b) {
            var c, d = [],
                e = 0,
                f = b.getElementsByTagName(a);
            if ("*" === a) {
                while (c = f[e++]) 1 === c.nodeType && d.push(c);
                return d
            }
            return f
        }, d.find.CLASS = c.getElementsByClassName && function(a, b) {
            return typeof b.getElementsByClassName !== B && o ? b.getElementsByClassName(a) : void 0
        }, q = [], p = [], (c.qsa = Z.test(e.querySelectorAll)) && (hb(function(a) {
            a.innerHTML = "<select t=''><option selected=''></option></select>", a.querySelectorAll("[t^='']").length && p.push("[*^$]=" + L + "*(?:''|\"\")"), a.querySelectorAll("[selected]").length || p.push("\\[" + L + "*(?:value|" + K + ")"), a.querySelectorAll(":checked").length || p.push(":checked")
        }), hb(function(a) {
            var b = e.createElement("input");
            b.setAttribute("type", "hidden"), a.appendChild(b).setAttribute("name", "D"), a.querySelectorAll("[name=d]").length && p.push("name" + L + "*[*^$|!~]?="), a.querySelectorAll(":enabled").length || p.push(":enabled", ":disabled"), a.querySelectorAll("*,:x"), p.push(",.*:")
        })), (c.matchesSelector = Z.test(r = n.webkitMatchesSelector || n.mozMatchesSelector || n.oMatchesSelector || n.msMatchesSelector)) && hb(function(a) {
            c.disconnectedMatch = r.call(a, "div"), r.call(a, "[s!='']:x"), q.push("!=", P)
        }), p = p.length && new RegExp(p.join("|")), q = q.length && new RegExp(q.join("|")), b = Z.test(n.compareDocumentPosition), s = b || Z.test(n.contains) ? function(a, b) {
            var c = 9 === a.nodeType ? a.documentElement : a,
                d = b && b.parentNode;
            return a === d || !(!d || 1 !== d.nodeType || !(c.contains ? c.contains(d) : a.compareDocumentPosition && 16 & a.compareDocumentPosition(d)))
        } : function(a, b) {
            if (b)
                while (b = b.parentNode)
                    if (b === a) return !0;
            return !1
        }, A = b ? function(a, b) {
            if (a === b) return k = !0, 0;
            var d = !a.compareDocumentPosition - !b.compareDocumentPosition;
            return d ? d : (d = (a.ownerDocument || a) === (b.ownerDocument || b) ? a.compareDocumentPosition(b) : 1, 1 & d || !c.sortDetached && b.compareDocumentPosition(a) === d ? a === e || a.ownerDocument === u && s(u, a) ? -1 : b === e || b.ownerDocument === u && s(u, b) ? 1 : j ? J.call(j, a) - J.call(j, b) : 0 : 4 & d ? -1 : 1)
        } : function(a, b) {
            if (a === b) return k = !0, 0;
            var c, d = 0,
                f = a.parentNode,
                g = b.parentNode,
                h = [a],
                i = [b];
            if (!f || !g) return a === e ? -1 : b === e ? 1 : f ? -1 : g ? 1 : j ? J.call(j, a) - J.call(j, b) : 0;
            if (f === g) return jb(a, b);
            c = a;
            while (c = c.parentNode) h.unshift(c);
            c = b;
            while (c = c.parentNode) i.unshift(c);
            while (h[d] === i[d]) d++;
            return d ? jb(h[d], i[d]) : h[d] === u ? -1 : i[d] === u ? 1 : 0
        }, e) : m
    }, eb.matches = function(a, b) {
        return eb(a, null, null, b)
    }, eb.matchesSelector = function(a, b) {
        if ((a.ownerDocument || a) !== m && l(a), b = b.replace(T, "='$1']"), !(!c.matchesSelector || !o || q && q.test(b) || p && p.test(b))) try {
            var d = r.call(a, b);
            if (d || c.disconnectedMatch || a.document && 11 !== a.document.nodeType) return d
        } catch (e) {}
        return eb(b, m, null, [a]).length > 0
    }, eb.contains = function(a, b) {
        return (a.ownerDocument || a) !== m && l(a), s(a, b)
    }, eb.attr = function(a, b) {
        (a.ownerDocument || a) !== m && l(a);
        var e = d.attrHandle[b.toLowerCase()],
            f = e && D.call(d.attrHandle, b.toLowerCase()) ? e(a, b, !o) : void 0;
        return void 0 !== f ? f : c.attributes || !o ? a.getAttribute(b) : (f = a.getAttributeNode(b)) && f.specified ? f.value : null
    }, eb.error = function(a) {
        throw new Error("Syntax error, unrecognized expression: " + a)
    }, eb.uniqueSort = function(a) {
        var b, d = [],
            e = 0,
            f = 0;
        if (k = !c.detectDuplicates, j = !c.sortStable && a.slice(0), a.sort(A), k) {
            while (b = a[f++]) b === a[f] && (e = d.push(f));
            while (e--) a.splice(d[e], 1)
        }
        return j = null, a
    }, e = eb.getText = function(a) {
        var b, c = "",
            d = 0,
            f = a.nodeType;
        if (f) {
            if (1 === f || 9 === f || 11 === f) {
                if ("string" == typeof a.textContent) return a.textContent;
                for (a = a.firstChild; a; a = a.nextSibling) c += e(a)
            } else if (3 === f || 4 === f) return a.nodeValue
        } else
            while (b = a[d++]) c += e(b);
        return c
    }, d = eb.selectors = {
        cacheLength: 50,
        createPseudo: gb,
        match: W,
        attrHandle: {},
        find: {},
        relative: {
            ">": {
                dir: "parentNode",
                first: !0
            },
            " ": {
                dir: "parentNode"
            },
            "+": {
                dir: "previousSibling",
                first: !0
            },
            "~": {
                dir: "previousSibling"
            }
        },
        preFilter: {
            ATTR: function(a) {
                return a[1] = a[1].replace(bb, cb), a[3] = (a[4] || a[5] || "").replace(bb, cb), "~=" === a[2] && (a[3] = " " + a[3] + " "), a.slice(0, 4)
            },
            CHILD: function(a) {
                return a[1] = a[1].toLowerCase(), "nth" === a[1].slice(0, 3) ? (a[3] || eb.error(a[0]), a[4] = +(a[4] ? a[5] + (a[6] || 1) : 2 * ("even" === a[3] || "odd" === a[3])), a[5] = +(a[7] + a[8] || "odd" === a[3])) : a[3] && eb.error(a[0]), a
            },
            PSEUDO: function(a) {
                var b, c = !a[5] && a[2];
                return W.CHILD.test(a[0]) ? null : (a[3] && void 0 !== a[4] ? a[2] = a[4] : c && U.test(c) && (b = pb(c, !0)) && (b = c.indexOf(")", c.length - b) - c.length) && (a[0] = a[0].slice(0, b), a[2] = c.slice(0, b)), a.slice(0, 3))
            }
        },
        filter: {
            TAG: function(a) {
                var b = a.replace(bb, cb).toLowerCase();
                return "*" === a ? function() {
                    return !0
                } : function(a) {
                    return a.nodeName && a.nodeName.toLowerCase() === b
                }
            },
            CLASS: function(a) {
                var b = x[a + " "];
                return b || (b = new RegExp("(^|" + L + ")" + a + "(" + L + "|$)")) && x(a, function(a) {
                    return b.test("string" == typeof a.className && a.className || typeof a.getAttribute !== B && a.getAttribute("class") || "")
                })
            },
            ATTR: function(a, b, c) {
                return function(d) {
                    var e = eb.attr(d, a);
                    return null == e ? "!=" === b : b ? (e += "", "=" === b ? e === c : "!=" === b ? e !== c : "^=" === b ? c && 0 === e.indexOf(c) : "*=" === b ? c && e.indexOf(c) > -1 : "$=" === b ? c && e.slice(-c.length) === c : "~=" === b ? (" " + e + " ").indexOf(c) > -1 : "|=" === b ? e === c || e.slice(0, c.length + 1) === c + "-" : !1) : !0
                }
            },
            CHILD: function(a, b, c, d, e) {
                var f = "nth" !== a.slice(0, 3),
                    g = "last" !== a.slice(-4),
                    h = "of-type" === b;
                return 1 === d && 0 === e ? function(a) {
                    return !!a.parentNode
                } : function(b, c, i) {
                    var j, k, l, m, n, o, p = f !== g ? "nextSibling" : "previousSibling",
                        q = b.parentNode,
                        r = h && b.nodeName.toLowerCase(),
                        s = !i && !h;
                    if (q) {
                        if (f) {
                            while (p) {
                                l = b;
                                while (l = l[p])
                                    if (h ? l.nodeName.toLowerCase() === r : 1 === l.nodeType) return !1;
                                o = p = "only" === a && !o && "nextSibling"
                            }
                            return !0
                        }
                        if (o = [g ? q.firstChild : q.lastChild], g && s) {
                            k = q[t] || (q[t] = {}), j = k[a] || [], n = j[0] === v && j[1], m = j[0] === v && j[2], l = n && q.childNodes[n];
                            while (l = ++n && l && l[p] || (m = n = 0) || o.pop())
                                if (1 === l.nodeType && ++m && l === b) {
                                    k[a] = [v, n, m];
                                    break
                                }
                        } else if (s && (j = (b[t] || (b[t] = {}))[a]) && j[0] === v) m = j[1];
                        else
                            while (l = ++n && l && l[p] || (m = n = 0) || o.pop())
                                if ((h ? l.nodeName.toLowerCase() === r : 1 === l.nodeType) && ++m && (s && ((l[t] || (l[t] = {}))[a] = [v, m]), l === b)) break;
                        return m -= e, m === d || m % d === 0 && m / d >= 0
                    }
                }
            },
            PSEUDO: function(a, b) {
                var c, e = d.pseudos[a] || d.setFilters[a.toLowerCase()] || eb.error("unsupported pseudo: " + a);
                return e[t] ? e(b) : e.length > 1 ? (c = [a, a, "", b], d.setFilters.hasOwnProperty(a.toLowerCase()) ? gb(function(a, c) {
                    var d, f = e(a, b),
                        g = f.length;
                    while (g--) d = J.call(a, f[g]), a[d] = !(c[d] = f[g])
                }) : function(a) {
                    return e(a, 0, c)
                }) : e
            }
        },
        pseudos: {
            not: gb(function(a) {
                var b = [],
                    c = [],
                    d = g(a.replace(Q, "$1"));
                return d[t] ? gb(function(a, b, c, e) {
                    var f, g = d(a, null, e, []),
                        h = a.length;
                    while (h--)(f = g[h]) && (a[h] = !(b[h] = f))
                }) : function(a, e, f) {
                    return b[0] = a, d(b, null, f, c), !c.pop()
                }
            }),
            has: gb(function(a) {
                return function(b) {
                    return eb(a, b).length > 0
                }
            }),
            contains: gb(function(a) {
                return function(b) {
                    return (b.textContent || b.innerText || e(b)).indexOf(a) > -1
                }
            }),
            lang: gb(function(a) {
                return V.test(a || "") || eb.error("unsupported lang: " + a), a = a.replace(bb, cb).toLowerCase(),
                    function(b) {
                        var c;
                        do
                            if (c = o ? b.lang : b.getAttribute("xml:lang") || b.getAttribute("lang")) return c = c.toLowerCase(), c === a || 0 === c.indexOf(a + "-");
                        while ((b = b.parentNode) && 1 === b.nodeType);
                        return !1
                    }
            }),
            target: function(b) {
                var c = a.location && a.location.hash;
                return c && c.slice(1) === b.id
            },
            root: function(a) {
                return a === n
            },
            focus: function(a) {
                return a === m.activeElement && (!m.hasFocus || m.hasFocus()) && !!(a.type || a.href || ~a.tabIndex)
            },
            enabled: function(a) {
                return a.disabled === !1
            },
            disabled: function(a) {
                return a.disabled === !0
            },
            checked: function(a) {
                var b = a.nodeName.toLowerCase();
                return "input" === b && !!a.checked || "option" === b && !!a.selected
            },
            selected: function(a) {
                return a.parentNode && a.parentNode.selectedIndex, a.selected === !0
            },
            empty: function(a) {
                for (a = a.firstChild; a; a = a.nextSibling)
                    if (a.nodeType < 6) return !1;
                return !0
            },
            parent: function(a) {
                return !d.pseudos.empty(a)
            },
            header: function(a) {
                return Y.test(a.nodeName)
            },
            input: function(a) {
                return X.test(a.nodeName)
            },
            button: function(a) {
                var b = a.nodeName.toLowerCase();
                return "input" === b && "button" === a.type || "button" === b
            },
            text: function(a) {
                var b;
                return "input" === a.nodeName.toLowerCase() && "text" === a.type && (null == (b = a.getAttribute("type")) || "text" === b.toLowerCase())
            },
            first: mb(function() {
                return [0]
            }),
            last: mb(function(a, b) {
                return [b - 1]
            }),
            eq: mb(function(a, b, c) {
                return [0 > c ? c + b : c]
            }),
            even: mb(function(a, b) {
                for (var c = 0; b > c; c += 2) a.push(c);
                return a
            }),
            odd: mb(function(a, b) {
                for (var c = 1; b > c; c += 2) a.push(c);
                return a
            }),
            lt: mb(function(a, b, c) {
                for (var d = 0 > c ? c + b : c; --d >= 0;) a.push(d);
                return a
            }),
            gt: mb(function(a, b, c) {
                for (var d = 0 > c ? c + b : c; ++d < b;) a.push(d);
                return a
            })
        }
    }, d.pseudos.nth = d.pseudos.eq;
    for (b in {
            radio: !0,
            checkbox: !0,
            file: !0,
            password: !0,
            image: !0
        }) d.pseudos[b] = kb(b);
    for (b in {
            submit: !0,
            reset: !0
        }) d.pseudos[b] = lb(b);

    function ob() {}
    ob.prototype = d.filters = d.pseudos, d.setFilters = new ob;

    function pb(a, b) {
        var c, e, f, g, h, i, j, k = y[a + " "];
        if (k) return b ? 0 : k.slice(0);
        h = a, i = [], j = d.preFilter;
        while (h) {
            (!c || (e = R.exec(h))) && (e && (h = h.slice(e[0].length) || h), i.push(f = [])), c = !1, (e = S.exec(h)) && (c = e.shift(), f.push({
                value: c,
                type: e[0].replace(Q, " ")
            }), h = h.slice(c.length));
            for (g in d.filter) !(e = W[g].exec(h)) || j[g] && !(e = j[g](e)) || (c = e.shift(), f.push({
                value: c,
                type: g,
                matches: e
            }), h = h.slice(c.length));
            if (!c) break
        }
        return b ? h.length : h ? eb.error(a) : y(a, i).slice(0)
    }

    function qb(a) {
        for (var b = 0, c = a.length, d = ""; c > b; b++) d += a[b].value;
        return d
    }

    function rb(a, b, c) {
        var d = b.dir,
            e = c && "parentNode" === d,
            f = w++;
        return b.first ? function(b, c, f) {
            while (b = b[d])
                if (1 === b.nodeType || e) return a(b, c, f)
        } : function(b, c, g) {
            var h, i, j = [v, f];
            if (g) {
                while (b = b[d])
                    if ((1 === b.nodeType || e) && a(b, c, g)) return !0
            } else
                while (b = b[d])
                    if (1 === b.nodeType || e) {
                        if (i = b[t] || (b[t] = {}), (h = i[d]) && h[0] === v && h[1] === f) return j[2] = h[2];
                        if (i[d] = j, j[2] = a(b, c, g)) return !0
                    }
        }
    }

    function sb(a) {
        return a.length > 1 ? function(b, c, d) {
            var e = a.length;
            while (e--)
                if (!a[e](b, c, d)) return !1;
            return !0
        } : a[0]
    }

    function tb(a, b, c) {
        for (var d = 0, e = b.length; e > d; d++) eb(a, b[d], c);
        return c
    }

    function ub(a, b, c, d, e) {
        for (var f, g = [], h = 0, i = a.length, j = null != b; i > h; h++)(f = a[h]) && (!c || c(f, d, e)) && (g.push(f), j && b.push(h));
        return g
    }

    function vb(a, b, c, d, e, f) {
        return d && !d[t] && (d = vb(d)), e && !e[t] && (e = vb(e, f)), gb(function(f, g, h, i) {
            var j, k, l, m = [],
                n = [],
                o = g.length,
                p = f || tb(b || "*", h.nodeType ? [h] : h, []),
                q = !a || !f && b ? p : ub(p, m, a, h, i),
                r = c ? e || (f ? a : o || d) ? [] : g : q;
            if (c && c(q, r, h, i), d) {
                j = ub(r, n), d(j, [], h, i), k = j.length;
                while (k--)(l = j[k]) && (r[n[k]] = !(q[n[k]] = l))
            }
            if (f) {
                if (e || a) {
                    if (e) {
                        j = [], k = r.length;
                        while (k--)(l = r[k]) && j.push(q[k] = l);
                        e(null, r = [], j, i)
                    }
                    k = r.length;
                    while (k--)(l = r[k]) && (j = e ? J.call(f, l) : m[k]) > -1 && (f[j] = !(g[j] = l))
                }
            } else r = ub(r === g ? r.splice(o, r.length) : r), e ? e(null, g, r, i) : H.apply(g, r)
        })
    }

    function wb(a) {
        for (var b, c, e, f = a.length, g = d.relative[a[0].type], h = g || d.relative[" "], j = g ? 1 : 0, k = rb(function(a) {
                return a === b
            }, h, !0), l = rb(function(a) {
                return J.call(b, a) > -1
            }, h, !0), m = [function(a, c, d) {
                return !g && (d || c !== i) || ((b = c).nodeType ? k(a, c, d) : l(a, c, d))
            }]; f > j; j++)
            if (c = d.relative[a[j].type]) m = [rb(sb(m), c)];
            else {
                if (c = d.filter[a[j].type].apply(null, a[j].matches), c[t]) {
                    for (e = ++j; f > e; e++)
                        if (d.relative[a[e].type]) break;
                    return vb(j > 1 && sb(m), j > 1 && qb(a.slice(0, j - 1).concat({
                        value: " " === a[j - 2].type ? "*" : ""
                    })).replace(Q, "$1"), c, e > j && wb(a.slice(j, e)), f > e && wb(a = a.slice(e)), f > e && qb(a))
                }
                m.push(c)
            }
        return sb(m)
    }

    function xb(a, b) {
        var c = b.length > 0,
            e = a.length > 0,
            f = function(f, g, h, j, k) {
                var l, n, o, p = 0,
                    q = "0",
                    r = f && [],
                    s = [],
                    t = i,
                    u = f || e && d.find.TAG("*", k),
                    w = v += null == t ? 1 : Math.random() || .1,
                    x = u.length;
                for (k && (i = g !== m && g); q !== x && null != (l = u[q]); q++) {
                    if (e && l) {
                        n = 0;
                        while (o = a[n++])
                            if (o(l, g, h)) {
                                j.push(l);
                                break
                            }
                        k && (v = w)
                    }
                    c && ((l = !o && l) && p--, f && r.push(l))
                }
                if (p += q, c && q !== p) {
                    n = 0;
                    while (o = b[n++]) o(r, s, g, h);
                    if (f) {
                        if (p > 0)
                            while (q--) r[q] || s[q] || (s[q] = F.call(j));
                        s = ub(s)
                    }
                    H.apply(j, s), k && !f && s.length > 0 && p + b.length > 1 && eb.uniqueSort(j)
                }
                return k && (v = w, i = t), r
            };
        return c ? gb(f) : f
    }
    g = eb.compile = function(a, b) {
        var c, d = [],
            e = [],
            f = z[a + " "];
        if (!f) {
            b || (b = pb(a)), c = b.length;
            while (c--) f = wb(b[c]), f[t] ? d.push(f) : e.push(f);
            f = z(a, xb(e, d)), f.selector = a
        }
        return f
    }, h = eb.select = function(a, b, e, f) {
        var h, i, j, k, l, m, n;
        if (e = e || [], "function" == typeof a && (m = a, a = m.selector), !f && (n = pb(a), 1 === n.length)) {
            if (i = n[0] = n[0].slice(0), !m && i.length > 2 && "ID" === (j = i[0]).type && c.getById && 9 === b.nodeType && o && d.relative[i[1].type]) {
                if (b = (d.find.ID(j.matches[0].replace(bb, cb), b) || [])[0], !b) return e;
                a = a.slice(i.shift().value.length)
            }
            h = W.needsContext.test(a) ? 0 : i.length;
            while (h--) {
                if (j = i[h], d.relative[k = j.type]) break;
                if ((l = d.find[k]) && (f = l(j.matches[0].replace(bb, cb), _.test(i[0].type) && nb(b.parentNode) || b))) {
                    if (i.splice(h, 1), a = f.length && qb(i), !a) return H.apply(e, f), e;
                    break
                }
            }
        }
        return (m || g(a, n))(f, b, !o, e, _.test(a) && nb(b.parentNode) || b), e
    }, c.sortStable = t.split("").sort(A).join("") === t, c.detectDuplicates = !!k, l(), c.sortDetached = hb(function(a) {
        return 1 & a.compareDocumentPosition(m.createElement("div"))
    }), hb(function(a) {
        return a.innerHTML = "<a href='#'></a>", "#" === a.firstChild.getAttribute("href")
    }) || ib("type|href|height|width", function(a, b, c) {
        return c ? void 0 : a.getAttribute(b, "type" === b.toLowerCase() ? 1 : 2)
    }), c.attributes && hb(function(a) {
        return a.innerHTML = "<input/>", a.firstChild.setAttribute("value", ""), "" === a.firstChild.getAttribute("value")
    }) || ib("value", function(a, b, c) {
        return c || "input" !== a.nodeName.toLowerCase() ? void 0 : a.defaultValue
    }), hb(function(a) {
        return null == a.getAttribute("disabled")
    }) || ib(K, function(a, b, c) {
        var d;
        return c ? void 0 : a[b] === !0 ? b.toLowerCase() : (d = a.getAttributeNode(b)) && d.specified ? d.value : null
    }), "function" == typeof define && define.amd ? define(function() {
        return eb
    }) : "undefined" != typeof module && module.exports ? module.exports = eb : a.Sizzle = eb
}(window);


Prototype._original_property = window.Sizzle;

;
(function(engine) {
    var extendElements = Prototype.Selector.extendElements;

    function select(selector, scope) {
        return extendElements(engine(selector, scope || document));
    }

    function match(element, selector) {
        return engine.matches(selector, [element]).length == 1;
    }


    Prototype.Selector.engine = engine;
    Prototype.Selector.select = select;
    Prototype.Selector.match = match;
})(Sizzle);

window.Sizzle = Prototype._original_property;
delete Prototype._original_property;

var Form = {
    reset: function(form) {
        form = $(form);
        form.reset();
        return form;
    },

    serializeElements: function(elements, options) {
        if (typeof options != 'object')
            options = {
                hash: !!options
            };
        else if (Object.isUndefined(options.hash))
            options.hash = true;
        var key, value, submitted = false,
            submit = options.submit,
            accumulator, initial;

        if (options.hash) {
            initial = {};
            accumulator = function(result, key, value) {
                if (key in result) {
                    if (!Object.isArray(result[key]))
                        result[key] = [result[key]];
                    result[key].push(value);
                } else
                    result[key] = value;
                return result;
            };
        } else {
            initial = '';
            accumulator = function(result, key, value) {
                value = value.gsub(/(\r)?\n/, '\r\n');
                value = encodeURIComponent(value);
                value = value.gsub(/%20/, '+');
                return result + (result ? '&' : '') + encodeURIComponent(key) + '=' + value;
            }
        }

        return elements.inject(initial, function(result, element) {
            if (!element.disabled && element.name) {
                key = element.name;
                value = $(element).getValue();
                if (value != null && element.type != 'file' && (element.type != 'submit' || (!submitted && submit !== false && (!submit || key == submit) && (submitted = true)))) {
                    result = accumulator(result, key, value);
                }
            }
            return result;
        });
    }
};

Form.Methods = {
    serialize: function(form, options) {
        return Form.serializeElements(Form.getElements(form), options);
    },

    getElements: function(form) {
        var elements = $(form).getElementsByTagName('*');
        var element, results = [],
            serializers = Form.Element.Serializers;

        for (var i = 0; element = elements[i]; i++) {
            if (serializers[element.tagName.toLowerCase()])
                results.push(Element.extend(element));
        }
        return results;
    },

    getInputs: function(form, typeName, name) {
        form = $(form);
        var inputs = form.getElementsByTagName('input');

        if (!typeName && !name)
            return $A(inputs).map(Element.extend);

        for (var i = 0, matchingInputs = [], length = inputs.length; i < length; i++) {
            var input = inputs[i];
            if ((typeName && input.type != typeName) || (name && input.name != name))
                continue;
            matchingInputs.push(Element.extend(input));
        }

        return matchingInputs;
    },

    disable: function(form) {
        form = $(form);
        Form.getElements(form).invoke('disable');
        return form;
    },

    enable: function(form) {
        form = $(form);
        Form.getElements(form).invoke('enable');
        return form;
    },

    findFirstElement: function(form) {
        var elements = $(form).getElements().findAll(function(element) {
            return 'hidden' != element.type && !element.disabled;
        });
        var firstByIndex = elements.findAll(function(element) {
            return element.hasAttribute('tabIndex') && element.tabIndex >= 0;
        }).sortBy(function(element) {
            return element.tabIndex
        }).first();

        return firstByIndex ? firstByIndex : elements.find(function(element) {
            return /^(?:input|select|textarea)$/i.test(element.tagName);
        });
    },

    focusFirstElement: function(form) {
        form = $(form);
        var element = form.findFirstElement();
        if (element)
            element.activate();
        return form;
    },

    request: function(form, options) {
        form = $(form), options = Object.clone(options || {});

        var params = options.parameters,
            action = form.readAttribute('action') || '';
        if (action.blank())
            action = window.location.href;
        options.parameters = form.serialize(true);

        if (params) {
            if (Object.isString(params))
                params = params.toQueryParams();
            Object.extend(options.parameters, params);
        }

        if (form.hasAttribute('method') && !options.method)
            options.method = form.method;

        return new Ajax.Request(action, options);
    }
};

/*--------------------------------------------------------------------------*/

Form.Element = {
    focus: function(element) {
        $(element).focus();
        return element;
    },

    select: function(element) {
        $(element).select();
        return element;
    }
};

Form.Element.Methods = {

    serialize: function(element) {
        element = $(element);
        if (!element.disabled && element.name) {
            var value = element.getValue();
            if (value != undefined) {
                var pair = {};
                pair[element.name] = value;
                return Object.toQueryString(pair);
            }
        }
        return '';
    },

    getValue: function(element) {
        element = $(element);
        var method = element.tagName.toLowerCase();
        return Form.Element.Serializers[method](element);
    },

    setValue: function(element, value) {
        //console.log('Prototype.setValue', element)
        element = $(element);
        var method = element.tagName.toLowerCase();
        Form.Element.Serializers[method](element, value);
        return element;
    },

    clear: function(element) {
        $(element).value = '';
        return element;
    },

    present: function(element) {
        return $(element).value != '';
    },

    activate: function(element) {
        element = $(element);
        try {
            element.focus();
            if (element.select && (element.tagName.toLowerCase() != 'input' || !(/^(?:button|reset|submit)$/i.test(element.type))))
                element.select();
        } catch (e) {}
        return element;
    },

    disable: function(element) {
        element = $(element);
        element.disabled = true;
        return element;
    },

    enable: function(element) {
        element = $(element);
        element.disabled = false;
        return element;
    }
};

/*--------------------------------------------------------------------------*/

var Field = Form.Element;

var $F = Form.Element.Methods.getValue;

/*--------------------------------------------------------------------------*/

Form.Element.Serializers = (function() {
    function input(element, value) {
        switch (element.type.toLowerCase()) {
            case 'checkbox':
            case 'radio':
                return inputSelector(element, value);
            default:
                return valueSelector(element, value);
        }
    }

    function inputSelector(element, value) {
        if (Object.isUndefined(value))
            return element.checked ? element.value : null;
        else
            element.checked = !!value;
    }

    function valueSelector(element, value) {
        if (Object.isUndefined(value))
            return element.value;
        else
            element.value = value;
    }

    function select(element, value) {
        if (Object.isUndefined(value))
            return (element.type === 'select-one' ? selectOne : selectMany)(element);

        var opt, currentValue, single = !Object.isArray(value);
        for (var i = 0, length = element.length; i < length; i++) {
            opt = element.options[i];
            currentValue = this.optionValue(opt);
            if (single) {
                if (currentValue == value) {
                    opt.selected = true;
                    return;
                }
            } else
                opt.selected = value.include(currentValue);
        }
    }

    function selectOne(element) {
        var index = element.selectedIndex;
        return index >= 0 ? optionValue(element.options[index]) : null;
    }

    function selectMany(element) {
        var values, length = element.length;
        if (!length)
            return null;

        for (var i = 0, values = []; i < length; i++) {
            var opt = element.options[i];
            if (opt.selected)
                values.push(optionValue(opt));
        }
        return values;
    }

    function optionValue(opt) {
        return Element.hasAttribute(opt, 'value') ? opt.value : opt.text;
    }

    return {
        input: input,
        inputSelector: inputSelector,
        textarea: valueSelector,
        select: select,
        selectOne: selectOne,
        selectMany: selectMany,
        optionValue: optionValue,
        button: valueSelector
    };
})();

/*--------------------------------------------------------------------------*/

Abstract.TimedObserver = Class.create(PeriodicalExecuter, {
    initialize: function($super, element, frequency, callback) {
        $super(callback, frequency);
        this.element = $(element);
        this.lastValue = this.getValue();
    },

    execute: function() {
        var value = this.getValue();
        if (Object.isString(this.lastValue) && Object.isString(value) ? this.lastValue != value : String(this.lastValue) != String(value)) {
            this.callback(this.element, value);
            this.lastValue = value;
        }
    }
});

Form.Element.Observer = Class.create(Abstract.TimedObserver, {
    getValue: function() {
        return Form.Element.getValue(this.element);
    }
});

Form.Observer = Class.create(Abstract.TimedObserver, {
    getValue: function() {
        return Form.serialize(this.element);
    }
});

/*--------------------------------------------------------------------------*/

Abstract.EventObserver = Class.create({
    initialize: function(element, callback) {
        this.element = $(element);
        this.callback = callback;

        this.lastValue = this.getValue();
        if (this.element.tagName.toLowerCase() == 'form')
            this.registerFormCallbacks();
        else
            this.registerCallback(this.element);
    },

    onElementEvent: function() {
        var value = this.getValue();
        if (this.lastValue != value) {
            this.callback(this.element, value);
            this.lastValue = value;
        }
    },

    registerFormCallbacks: function() {
        Form.getElements(this.element).each(this.registerCallback, this);
    },

    registerCallback: function(element) {
        if (element.type) {
            switch (element.type.toLowerCase()) {
                case 'checkbox':
                case 'radio':
                    Event.observe(element, 'click', this.onElementEvent.bind(this));
                    break;
                default:
                    Event.observe(element, 'change', this.onElementEvent.bind(this));
                    break;
            }
        }
    }
});

Form.Element.EventObserver = Class.create(Abstract.EventObserver, {
    getValue: function() {
        return Form.Element.getValue(this.element);
    }
});

Form.EventObserver = Class.create(Abstract.EventObserver, {
    getValue: function() {
        return Form.serialize(this.element);
    }
});
(function(GLOBAL) {
    var DIV = document.createElement('div');
    var docEl = document.documentElement;
    var MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED = 'onmouseenter' in docEl && 'onmouseleave' in docEl;

    var Event = {
        KEY_BACKSPACE: 8,
        KEY_TAB: 9,
        KEY_RETURN: 13,
        KEY_ESC: 27,
        KEY_LEFT: 37,
        KEY_UP: 38,
        KEY_RIGHT: 39,
        KEY_DOWN: 40,
        KEY_DELETE: 46,
        KEY_HOME: 36,
        KEY_END: 35,
        KEY_PAGEUP: 33,
        KEY_PAGEDOWN: 34,
        KEY_INSERT: 45
    };

    var isIELegacyEvent = function(event) {
        return false;
    };

    if (window.attachEvent) {
        if (window.addEventListener) {
            isIELegacyEvent = function(event) {
                return !(event instanceof window.Event);
            };
        } else {
            isIELegacyEvent = function(event) {
                return true;
            };
        }
    }

    var _isButton;

    function _isButtonForDOMEvents(event, code) {
        return event.which ? (event.which === code + 1) : (event.button === code);
    }

    var legacyButtonMap = {
        0: 1,
        1: 4,
        2: 2
    };

    function _isButtonForLegacyEvents(event, code) {
        return event.button === legacyButtonMap[code];
    }

    function _isButtonForWebKit(event, code) {
        switch (code) {
            case 0:
                return event.which == 1 && !event.metaKey;
            case 1:
                return event.which == 2 || (event.which == 1 && event.metaKey);
            case 2:
                return event.which == 3;
            default:
                return false;
        }
    }

    if (window.attachEvent) {
        if (!window.addEventListener) {
            _isButton = _isButtonForLegacyEvents;
        } else {
            _isButton = function(event, code) {
                return isIELegacyEvent(event) ? _isButtonForLegacyEvents(event, code) : _isButtonForDOMEvents(event, code);
            }
        }
    } else if (Prototype.Browser.WebKit) {
        _isButton = _isButtonForWebKit;
    } else {
        _isButton = _isButtonForDOMEvents;
    }

    function isLeftClick(event) {
        return _isButton(event, 0)
    }

    function isMiddleClick(event) {
        return _isButton(event, 1)
    }

    function isRightClick(event) {
        return _isButton(event, 2)
    }

    function element(event) {
        return Element.extend(_element(event));
    }

    function _element(event) {
        event = Event.extend(event);

        var node = event.target,
            type = event.type,
            currentTarget = event.currentTarget;

        if (currentTarget && currentTarget.tagName) {
            if (type === 'load' || type === 'error' || (type === 'click' && currentTarget.tagName.toLowerCase() === 'input' && currentTarget.type === 'radio'))
                node = currentTarget;
        }

        if (node.nodeType == Node.TEXT_NODE)
            node = node.parentNode;

        return Element.extend(node);
    }

    function findElement(event, expression) {
        var element = _element(event),
            match = Prototype.Selector.match;
        if (!expression)
            return Element.extend(element);
        while (element) {
            if (Object.isElement(element) && match(element, expression))
                return Element.extend(element);
            element = element.parentNode;
        }
    }

    function pointer(event) {
        return {
            x: pointerX(event),
            y: pointerY(event)
        };
    }

    function pointerX(event) {
        var docElement = document.documentElement,
            body = document.body || {
                scrollLeft: 0
            };

        return event.pageX || (event.clientX + (docElement.scrollLeft || body.scrollLeft) - (docElement.clientLeft || 0));
    }

    function pointerY(event) {
        var docElement = document.documentElement,
            body = document.body || {
                scrollTop: 0
            };

        return event.pageY || (event.clientY + (docElement.scrollTop || body.scrollTop) - (docElement.clientTop || 0));
    }

    function stop(event) {
        Event.extend(event);
        event.preventDefault();
        event.stopPropagation();

        event.stopped = true;
    }


    Event.Methods = {
        isLeftClick: isLeftClick,
        isMiddleClick: isMiddleClick,
        isRightClick: isRightClick,

        element: element,
        findElement: findElement,

        pointer: pointer,
        pointerX: pointerX,
        pointerY: pointerY,

        stop: stop
    };

    var methods = Object.keys(Event.Methods).inject({}, function(m, name) {
        m[name] = Event.Methods[name].methodize();
        return m;
    });

    if (window.attachEvent) {
        function _relatedTarget(event) {
            var element;
            switch (event.type) {
                case 'mouseover':
                case 'mouseenter':
                    element = event.fromElement;
                    break;
                case 'mouseout':
                case 'mouseleave':
                    element = event.toElement;
                    break;
                default:
                    return null;
            }
            return Element.extend(element);
        }

        var additionalMethods = {
            stopPropagation: function() {
                this.cancelBubble = true
            },
            preventDefault: function() {
                this.returnValue = false
            },
            inspect: function() {
                return '[object Event]'
            }
        };

        Event.extend = function(event, element) {
            if (!event)
                return false;

            if (!isIELegacyEvent(event))
                return event;

            if (event._extendedByPrototype)
                return event;
            event._extendedByPrototype = Prototype.emptyFunction;

            var pointer = Event.pointer(event);

            Object.extend(event, {
                target: event.srcElement || element,
                relatedTarget: _relatedTarget(event),
                pageX: pointer.x,
                pageY: pointer.y
            });

            Object.extend(event, methods);
            Object.extend(event, additionalMethods);

            return event;
        };
    } else {
        Event.extend = Prototype.K;
    }

    if (window.addEventListener) {
        Event.prototype = window.Event.prototype || document.createEvent('HTMLEvents').__proto__;
        Object.extend(Event.prototype, methods);
    }

    var EVENT_TRANSLATIONS = {
        mouseenter: 'mouseover',
        mouseleave: 'mouseout'
    };

    function getDOMEventName(eventName) {
        return EVENT_TRANSLATIONS[eventName] || eventName;
    }

    if (MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED)
        getDOMEventName = Prototype.K;

    function getUniqueElementID(element) {
        if (element === window)
            return 0;

        if (typeof element._prototypeUID === 'undefined')
            element._prototypeUID = Element.Storage.UID++;
        return element._prototypeUID;
    }

    function getUniqueElementID_IE(element) {
        if (element === window)
            return 0;
        if (element == document)
            return 1;
        return element.uniqueID;
    }

    if ('uniqueID' in DIV)
        getUniqueElementID = getUniqueElementID_IE;

    function isCustomEvent(eventName) {
        return eventName.include(':');
    }


    Event._isCustomEvent = isCustomEvent;

    function getRegistryForElement(element, uid) {
        var CACHE = GLOBAL.Event.cache;
        if (Object.isUndefined(uid))
            uid = getUniqueElementID(element);
        if (!CACHE[uid])
            CACHE[uid] = {
                element: element
            };
        return CACHE[uid];
    }

    function destroyRegistryForElement(element, uid) {
        if (Object.isUndefined(uid))
            uid = getUniqueElementID(element);
        delete GLOBAL.Event.cache[uid];
    }

    function register(element, eventName, handler) {
        var registry = getRegistryForElement(element);
        if (!registry[eventName])
            registry[eventName] = [];
        var entries = registry[eventName];

        var i = entries.length;
        while (i--)
            if (entries[i].handler === handler)
                return null;

        var uid = getUniqueElementID(element);
        var responder = GLOBAL.Event._createResponder(uid, eventName, handler);
        var entry = {
            responder: responder,
            handler: handler
        };

        entries.push(entry);
        return entry;
    }

    function unregister(element, eventName, handler) {
        var registry = getRegistryForElement(element);
        var entries = registry[eventName];
        if (!entries)
            return;

        var i = entries.length,
            entry;
        while (i--) {
            if (entries[i].handler === handler) {
                entry = entries[i];
                break;
            }
        }

        if (!entry)
            return;

        var index = entries.indexOf(entry);
        entries.splice(index, 1);

        return entry;
    }

    function observe(element, eventName, handler) {
        element = $(element);
        var entry = register(element, eventName, handler);

        if (entry === null)
            return element;

        var responder = entry.responder;
        if (isCustomEvent(eventName))
            observeCustomEvent(element, eventName, responder);
        else
            observeStandardEvent(element, eventName, responder);

        return element;
    }

    function observeStandardEvent(element, eventName, responder) {
        var actualEventName = getDOMEventName(eventName);
        if (element.addEventListener) {
            element.addEventListener(actualEventName, responder, false);
        } else {
            element.attachEvent('on' + actualEventName, responder);
        }
    }

    function observeCustomEvent(element, eventName, responder) {
        if (element.addEventListener) {
            element.addEventListener('dataavailable', responder, false);
        } else {
            element.attachEvent('ondataavailable', responder);
            element.attachEvent('onlosecapture', responder);
        }
    }

    function stopObserving(element, eventName, handler) {
        element = $(element);
        var handlerGiven = !Object.isUndefined(handler),
            eventNameGiven = !Object.isUndefined(eventName);

        if (!eventNameGiven && !handlerGiven) {
            stopObservingElement(element);
            return element;
        }

        if (!handlerGiven) {
            stopObservingEventName(element, eventName);
            return element;
        }

        var entry = unregister(element, eventName, handler);

        if (!entry)
            return element;
        removeEvent(element, eventName, entry.responder);
        return element;
    }

    function stopObservingStandardEvent(element, eventName, responder) {
        var actualEventName = getDOMEventName(eventName);
        if (element.removeEventListener) {
            element.removeEventListener(actualEventName, responder, false);
        } else {
            element.detachEvent('on' + actualEventName, responder);
        }
    }

    function stopObservingCustomEvent(element, eventName, responder) {
        if (element.removeEventListener) {
            element.removeEventListener('dataavailable', responder, false);
        } else {
            element.detachEvent('ondataavailable', responder);
            element.detachEvent('onlosecapture', responder);
        }
    }

    function stopObservingElement(element) {
        var uid = getUniqueElementID(element),
            registry = getRegistryForElement(element, uid);

        destroyRegistryForElement(element, uid);

        var entries, i;
        for (var eventName in registry) {
            if (eventName === 'element')
                continue;

            entries = registry[eventName];
            i = entries.length;
            while (i--) removeEvent(element, eventName, entries[i].responder);
        }
    }

    function stopObservingEventName(element, eventName) {
        var registry = getRegistryForElement(element);
        var entries = registry[eventName];
        if (!entries)
            return;
        delete registry[eventName];

        var i = entries.length;
        while (i--) removeEvent(element, eventName, entries[i].responder);
    }

    function removeEvent(element, eventName, handler) {
        if (isCustomEvent(eventName))
            stopObservingCustomEvent(element, eventName, handler);
        else
            stopObservingStandardEvent(element, eventName, handler);
    }

    function getFireTarget(element) {
        if (element !== document)
            return element;
        if (document.createEvent && !element.dispatchEvent)
            return document.documentElement;
        return element;
    }

    function fire(element, eventName, memo, bubble) {
        element = getFireTarget($(element));
        if (Object.isUndefined(bubble))
            bubble = true;
        memo = memo || {};

        var event = fireEvent(element, eventName, memo, bubble);
        return Event.extend(event);
    }

    function fireEvent_DOM(element, eventName, memo, bubble) {
        var event = document.createEvent('HTMLEvents');
        event.initEvent('dataavailable', bubble, true);

        event.eventName = eventName;
        event.memo = memo;

        element.dispatchEvent(event);
        return event;
    }

    function fireEvent_IE(element, eventName, memo, bubble) {
        var event = document.createEventObject();
        event.eventType = bubble ? 'ondataavailable' : 'onlosecapture';

        event.eventName = eventName;
        event.memo = memo;

        element.fireEvent(event.eventType, event);
        return event;
    }

    var fireEvent = document.createEvent ? fireEvent_DOM : fireEvent_IE;

    Event.Handler = Class.create({
        initialize: function(element, eventName, selector, callback) {
            this.element = $(element);
            this.eventName = eventName;
            this.selector = selector;
            this.callback = callback;
            this.handler = this.handleEvent.bind(this);
        },

        start: function() {
            Event.observe(this.element, this.eventName, this.handler);
            return this;
        },

        stop: function() {
            Event.stopObserving(this.element, this.eventName, this.handler);
            return this;
        },

        handleEvent: function(event) {
            var element = Event.findElement(event, this.selector);
            if (element)
                this.callback.call(this.element, event, element);
        }
    });

    function on(element, eventName, selector, callback) {
        element = $(element);
        if (Object.isFunction(selector) && Object.isUndefined(callback)) {
            callback = selector, selector = null;
        }

        return new Event.Handler(element, eventName, selector, callback).start();
    }


    Object.extend(Event, Event.Methods);

    Object.extend(Event, {
        fire: fire,
        observe: observe,
        stopObserving: stopObserving,
        on: on
    });

    Element.addMethods({
        fire: fire,

        observe: observe,

        stopObserving: stopObserving,

        on: on
    });

    Object.extend(document, {
        fire: fire.methodize(),

        observe: observe.methodize(),

        stopObserving: stopObserving.methodize(),

        on: on.methodize(),

        loaded: false
    });

    if (GLOBAL.Event)
        Object.extend(window.Event, Event);
    else
        GLOBAL.Event = Event;

    GLOBAL.Event.cache = {};

    function destroyCache_IE() {
        GLOBAL.Event.cache = null;
    }

    if (window.attachEvent)
        window.attachEvent('onunload', destroyCache_IE);

    DIV = null;
    docEl = null;
})(this);

(function(GLOBAL) {
    /* Code for creating leak-free event responders is based on work by
     John-David Dalton. */

    var docEl = document.documentElement;
    var MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED = 'onmouseenter' in docEl && 'onmouseleave' in docEl;

    function isSimulatedMouseEnterLeaveEvent(eventName) {
        return !MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED && (eventName === 'mouseenter' || eventName === 'mouseleave');
    }

    function createResponder(uid, eventName, handler) {
        if (Event._isCustomEvent(eventName))
            return createResponderForCustomEvent(uid, eventName, handler);
        if (isSimulatedMouseEnterLeaveEvent(eventName))
            return createMouseEnterLeaveResponder(uid, eventName, handler);

        return function(event) {
            var cacheEntry = Event.cache[uid];
            var element = cacheEntry.element;

            Event.extend(event, element);
            handler.call(element, event);
        };
    }

    function createResponderForCustomEvent(uid, eventName, handler) {
        return function(event) {
            var cacheEntry = Event.cache[uid],
                element = cacheEntry.element;

            if (Object.isUndefined(event.eventName))
                return false;

            if (event.eventName !== eventName)
                return false;

            Event.extend(event, element);
            handler.call(element, event);
        };
    }

    function createMouseEnterLeaveResponder(uid, eventName, handler) {
        return function(event) {
            var cacheEntry = Event.cache[uid],
                element = cacheEntry.element;

            Event.extend(event, element);
            var parent = event.relatedTarget;

            while (parent && parent !== element) {
                try {
                    parent = parent.parentNode;
                } catch (e) {
                    parent = element;
                }
            }

            if (parent === element)
                return;
            handler.call(element, event);
        }
    }


    GLOBAL.Event._createResponder = createResponder;
    docEl = null;
})(this);

(function(GLOBAL) {
    /* Support for the DOMContentLoaded event is based on work by Dan Webb,
     Matthias Miller, Dean Edwards, John Resig, and Diego Perini. */

    var TIMER;

    function fireContentLoadedEvent() {
        if (document.loaded)
            return;
        if (TIMER)
            window.clearTimeout(TIMER);
        document.loaded = true;
        document.fire('dom:loaded');
    }

    function checkReadyState() {
        if (document.readyState === 'complete') {
            document.detachEvent('onreadystatechange', checkReadyState);
            fireContentLoadedEvent();
        }
    }

    function pollDoScroll() {
        try {
            document.documentElement.doScroll('left');
        } catch (e) {
            TIMER = pollDoScroll.defer();
            return;
        }

        fireContentLoadedEvent();
    }

    if (document.addEventListener) {
        document.addEventListener('DOMContentLoaded', fireContentLoadedEvent, false);
    } else {
        document.attachEvent('onreadystatechange', checkReadyState);
        if (window == top)
            TIMER = pollDoScroll.defer();
    }

    Event.observe(window, 'load', fireContentLoadedEvent);
})(this);

Element.addMethods();
/*------------------------------- DEPRECATED -------------------------------*/

Hash.toQueryString = Object.toQueryString;

var Toggle = {
    display: Element.toggle
};

Element.Methods.childOf = Element.Methods.descendantOf;

var Insertion = {
    Before: function(element, content) {
        return Element.insert(element, {
            before: content
        });
    },

    Top: function(element, content) {
        return Element.insert(element, {
            top: content
        });
    },

    Bottom: function(element, content) {
        return Element.insert(element, {
            bottom: content
        });
    },

    After: function(element, content) {
        return Element.insert(element, {
            after: content
        });
    }
};

var $continue = new Error('"throw $continue" is deprecated, use "return" instead');

var Position = {
    includeScrollOffsets: false,

    prepare: function() {
        this.deltaX = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
        this.deltaY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    },

    within: function(element, x, y) {
        if (this.includeScrollOffsets)
            return this.withinIncludingScrolloffsets(element, x, y);
        this.xcomp = x;
        this.ycomp = y;
        this.offset = Element.cumulativeOffset(element);

        return (y >= this.offset[1] && y < this.offset[1] + element.offsetHeight && x >= this.offset[0] && x < this.offset[0] + element.offsetWidth);
    },

    withinIncludingScrolloffsets: function(element, x, y) {
        var offsetcache = Element.cumulativeScrollOffset(element);

        this.xcomp = x + offsetcache[0] - this.deltaX;
        this.ycomp = y + offsetcache[1] - this.deltaY;
        this.offset = Element.cumulativeOffset(element);

        return (this.ycomp >= this.offset[1] && this.ycomp < this.offset[1] + element.offsetHeight && this.xcomp >= this.offset[0] && this.xcomp < this.offset[0] + element.offsetWidth);
    },

    overlap: function(mode, element) {
        if (!mode)
            return 0;
        if (mode == 'vertical')
            return ((this.offset[1] + element.offsetHeight) - this.ycomp) / element.offsetHeight;
        if (mode == 'horizontal')
            return ((this.offset[0] + element.offsetWidth) - this.xcomp) / element.offsetWidth;
    },

    cumulativeOffset: Element.Methods.cumulativeOffset,

    positionedOffset: Element.Methods.positionedOffset,

    absolutize: function(element) {
        Position.prepare();
        return Element.absolutize(element);
    },

    relativize: function(element) {
        Position.prepare();
        return Element.relativize(element);
    },

    realOffset: Element.Methods.cumulativeScrollOffset,

    offsetParent: Element.Methods.getOffsetParent,

    page: Element.Methods.viewportOffset,

    clone: function(source, target, options) {
        options = options || {};
        return Element.clonePosition(target, source, options);
    }
};

/*--------------------------------------------------------------------------*/

if (!document.getElementsByClassName)
    document.getElementsByClassName = function(instanceMethods) {
        function iter(name) {
            return name.blank() ? null : "[contains(concat(' ', @class, ' '), ' " + name + " ')]";
        }


        instanceMethods.getElementsByClassName = Prototype.BrowserFeatures.XPath ? function(element, className) {
            className = className.toString().strip();
            var cond = /\s/.test(className) ? $w(className).map(iter).join('') : iter(className);
            return cond ? document._getElementsByXPath('.//*' + cond, element) : [];
        } : function(element, className) {
            className = className.toString().strip();
            var elements = [],
                classNames = (/\s/.test(className) ? $w(className) : null);
            if (!classNames && !className)
                return elements;

            var nodes = $(element).getElementsByTagName('*');
            className = ' ' + className + ' ';

            for (var i = 0, child, cn; child = nodes[i]; i++) {
                if (child.className && (cn = ' ' + child.className + ' ') && (cn.include(className) || (classNames && classNames.all(function(name) {
                        return !name.toString().blank() && cn.include(' ' + name + ' ');
                    }))))
                    elements.push(Element.extend(child));
            }
            return elements;
        };

        return function(className, parentElement) {
            return $(parentElement || document.body).getElementsByClassName(className);
        };
    }(Element.Methods);

/*--------------------------------------------------------------------------*/

Element.ClassNames = Class.create();
Element.ClassNames.prototype = {
    initialize: function(element) {
        this.element = $(element);
    },

    _each: function(iterator, context) {
        this.element.className.split(/\s+/).select(function(name) {
            return name.length > 0;
        })._each(iterator, context);
    },

    set: function(className) {
        this.element.className = className;
    },

    add: function(classNameToAdd) {
        if (this.include(classNameToAdd))
            return;
        this.set($A(this).concat(classNameToAdd).join(' '));
    },

    remove: function(classNameToRemove) {
        if (!this.include(classNameToRemove))
            return;
        this.set($A(this).without(classNameToRemove).join(' '));
    },

    toString: function() {
        return $A(this).join(' ');
    }
};

Object.extend(Element.ClassNames.prototype, Enumerable);

/*--------------------------------------------------------------------------*/

(function() {
    window.Selector = Class.create({
        initialize: function(expression) {
            this.expression = expression.strip();
        },

        findElements: function(rootElement) {
            return Prototype.Selector.select(this.expression, rootElement);
        },

        match: function(element) {
            return Prototype.Selector.match(element, this.expression);
        },

        toString: function() {
            return this.expression;
        },

        inspect: function() {
            return "#<Selector: " + this.expression + ">";
        }
    });

    Object.extend(Selector, {
        matchElements: function(elements, expression) {
            var match = Prototype.Selector.match,
                results = [];

            for (var i = 0, length = elements.length; i < length; i++) {
                var element = elements[i];
                if (match(element, expression)) {
                    results.push(Element.extend(element));
                }
            }
            return results;
        },

        findElement: function(elements, expression, index) {
            index = index || 0;
            var matchIndex = 0,
                element;
            for (var i = 0, length = elements.length; i < length; i++) {
                element = elements[i];
                if (Prototype.Selector.match(element, expression) && index === matchIndex++) {
                    return Element.extend(element);
                }
            }
        },

        findChildElements: function(element, expressions) {
            var selector = expressions.toArray().join(', ');
            return Prototype.Selector.select(selector, element || document);
        }
    });
})();
/*
(function($scope) {
  try {
    var metrikaConf = {};
    var baMetrikaPublic = {
      track: baMetrikaTrack
    };

    function makeUUID(a) {
      'use strict';

      return a ?
        (a ^ Math.random() * 16 >> a / 4).toString(16) :
        ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, makeUUID);
    }


    // Simple Queue wrapper for calling asyncronus function's for example adblock check.
    var MetrikaTaskQueue = function(tasks, onComplete) {
      var taskLength = tasks.length;
      var taskFinished = 0;
      var locklist = [];
      tasks.forEach(function(task) {
        var name = task.toString();
        task(function() {
          if (locklist.indexOf(name) == -1) {
            ++taskFinished;
          }
        })
      });
      var taskSended = false;
      var itv = setInterval(function() {
        if (taskSended) {
          try {
            clearInterval(itv);
          } catch (e) {}
          return;
        }
        if (taskLength == taskFinished) {
          onComplete();
          try {
            clearInterval(itv);
          } catch (e) {}
        }
      })
    };

    var cs = document.currentScript || {
      src: 'https://bmetrika.com/'
    };

    var MetrikaBaseProto = 'https';
    var MetrikaBaseUrl = 'bmetrika.com';
    var MetrikaSession = makeUUID();
    // base entry point
    var baMetrika = function(config) {
      metrikaConf = config || {};

      // add location
      if (!('hideLocation' in config)) {
        metrikaConf.l = escape(top.location.href);
      }
      // add hostname
      metrikaConf.d = escape(top.location.hostname);

      // add HTTP Referer
      if (!('hideReferer' in config)) {
        if (document.referrer && String(document.referrer).indexOf(top.location.hostname) == -1) {
          metrikaConf.r = escape(document.referrer);
        }
      }


      // add device informations to metrikaConf.
      var tasks = [
        baMetrikaDeviceInfo,
        baMetrikaAdblock,
        baIsIframe
      ];

      var q = MetrikaTaskQueue(tasks, function() {
        // send informations to backend.
        baMetrikaSendInformations();
      });

      return baMetrikaPublic;
    };


    // key;value tracker according this particular session.
    var baMetrikaTrack = function(key, value) {
      if (window.bullads && ('disableMetrika' in window.bullads) && window.bullads.disableMetrika == true) {
        return;
      }
      var idPerSrc = 'ItE6UM9u';//cs.src.match(/\/([a-zA-Z0-9_-]+)\.js/)[1];
      var img = new Image();
      img.src = MetrikaBaseProto+'://' + MetrikaBaseUrl + '/metrika/kv/' + idPerSrc + '.png?k=' + escape(key) + '&v=' + escape(value) + '&s=' + MetrikaSession;
    }


    // send all informations to our backend.

    var baMetrikaSendInformations = function() {
      if (window.bullads && ('disableMetrika' in window.bullads) && window.bullads.disableMetrika == true) {
        return;
      }
      var baSend = [];
      Object.keys(metrikaConf).forEach(function(key) {
        baSend.push(key + '=' + escape(metrikaConf[key]));
      });
      var idPerSrc = 'ItE6UM9u';//cs.src.match(/\/([a-zA-Z0-9_-]+)\.js/)[1];
      var img = new Image();
      img.src = MetrikaBaseProto+'://' + MetrikaBaseUrl + '/metrika/' + idPerSrc + '.png?' + baSend.join("&");
    }

    function lsTest() {
      var test = 'test';
      try {
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    };

    function uuid() {
      if (navigator.doNotTrack == 1) {
        return makeUUID(); // don't log user, we respect the privacy.
      }
      if (localStorage.getItem('mid')) {
        return localStorage.getItem('mid')
      } else {
        var id = makeUUID();
        localStorage.setItem('mid', id);
        document.cookie = "mid=" + id + "; expires=Thu, 18 Dec 2020 12:00:00 UTC; path=/";
        return id;
      }
    }

    var baMetrikaDeviceInfo = function(next) {
      metrikaConf.ce = navigator.cookieEnabled;
      metrikaConf.dd = [window.screen.availWidth, window.screen.availHeight].join("x");
      metrikaConf.bd = [window.innerHeight, window.innerWidth].join("x");
      metrikaConf.ls = lsTest();
      if (metrikaConf.ls) {
        metrikaConf.uu = uuid();
      }
      metrikaConf.dnt = navigator.doNotTrack;

      next();
    };

    // checks if we are running in an iframe environment.
    var baIsIframe = function(next) {
      try {
        metrikaConf.ifr = window.top != window.self
      } catch (a) {
        metrikaConf.ifr = 0;
      }
      next()
    }


    // checks for adblock
    var baMetrikaAdblock = function(next) {
      // this will check if adblock is available (thanks to yandex.metrika.)
      var img = document.createElement('img');
      var rm = function() {
        try {
          img.parentNode.removeChild(img);
        } catch (e) {}
        try {
          img.parentElement.removeChild(img);
        } catch (e) {}
      }
      img.onload = function() {
        metrikaConf.adblock = false;
        rm() & next();
      };
      img.onerror = function() {
        metrikaConf.adblock = true;
        rm() & next();
      };
      img.id = makeUUID();
      img.src = location.protocol + '//' + MetrikaBaseUrl + '/' + String.fromCharCode(97, 100, 118, 101, 114, 116, 46, 103, 105, 102)
      img.style.visibility = 'hidden';
      document.body.appendChild(img);
    }

    $scope.BA = {
      Metrika: function(config) {
        return new baMetrika(config);
      }
    };
  } catch (e) {}
})(window);
*/

(function($scope) {
    try {

        /* polyfill */
        if (!Array.isArray) {
            Array.isArray = function(arg) {
                return Object.prototype.toString.call(arg) === '[object Array]';
            };
        }
        if (!Object.isObject) {
            Object.isObject = function(arg) {
                return arg === Object(arg);
            }
        }

        ! function(t, n) {
            t = t || "docReady", n = n || window;
            var e = [],
                o = !1,
                d = !1;

            function a() {
                if (!o) {
                    o = !0;
                    for (var t = 0; t < e.length; t++) e[t].fn.call(window, e[t].ctx);
                    e = []
                }
            }

            function c() {
                "complete" === document.readyState && a()
            }
            n[t] = function(t, n) {
                if ("function" != typeof t) throw new TypeError("callback for docReady(fn) must be a function");
                o ? setTimeout(function() {
                    t(n)
                }, 1) : (e.push({
                    fn: t,
                    ctx: n
                }), "complete" === document.readyState ? setTimeout(a, 1) : d || (document.addEventListener ? (document.addEventListener("DOMContentLoaded", a, !1), window.addEventListener("load", a, !1)) : (document.attachEvent("onreadystatechange", c), window.attachEvent("onload", a)), d = !0))
            }
        }("docReady", window);


        var metrikaConf = {};


        function makeUUID(a) {
            'use strict';

            return a ?
                (a ^ Math.random() * 16 >> a / 4).toString(16) :
                ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, makeUUID);
        }

        var baMetrikaInitialized = +new Date();
        var MetrikaSession = makeUUID();
        var baMetrikaTrackSessionUUID = makeUUID();
        var baMetrikaTrackSessionStack = [];
        var baMetrikaTrackSession = function baMetrikaTrackSession(object) {
            // will cache all data, send it as one session id, which gets returned every time.

            if (Array.isArray(object) || Object.isObject(object)) {
                baMetrikaTrackSessionStack.push(object);
            }

            return baMetrikaTrackSessionUUID;
        };


        var baMetrikaSend = function baMetrikaSend(payload) {
            // we send stack to baMetrika tracking endpoint.
            try {
                var xhr = new XMLHttpRequest();
                var url = MetrikaBaseProto + '://' + MetrikaBaseUrl + '/metrika/' + baMetrikaTrackerID + '/stack';
                xhr.open("POST", url, false);
                xhr.setRequestHeader("Content-type", "application/json");
                var data = JSON.stringify(payload);
                xhr.send(data);
            } catch (e) {} // don't disturb the site owner.

        }


        var baMetrikaReportInit = false;
        var baMetrikaReport = function baMetrikaReport() {
            return;
            console.log("baMetrikaReport called")
            if (!baMetrikaReportInit) {
                //  return;
            }
            baMetrikaReportInit = true;


            // send stuff to server.
            try {
                var baMetrikaTimeOnPage = +new Date() - baMetrikaInitialized; //msecs.

                var baMetrikaReport = {
                    s: MetrikaSession,
                    t: baMetrikaTimeOnPage
                };
                if (baMetrikaTrackSessionStack.length > 0) {
                    baMetrikaReport.tr = {
                        s: baMetrikaTrackSessionUUID,
                        x: baMetrikaTrackSessionStack
                    };
                }
                console.log(baMetrikaReport)
                baMetrikaSend(baMetrikaReport);
            } catch (e) {
                console.log(e.stack)
            }
        }

        // event listener for closing window, only needed in some cases?!
        var baMetrikaObserveWindowClose = function baMetrikaObserveWindowClose() {
            window.addEventListener("beforeunload", baMetrikaReport);
            //window.addEventListener("unload", baMetrikaReport);
        }

        // observe document close for sending more informations, should be
        baMetrikaObserveWindowClose();


        // Simple Queue wrapper for calling asyncronus function's for example adblock check.
        var MetrikaTaskQueue = function(tasks, onComplete) {
            var taskLength = tasks.length;
            var taskFinished = 0;
            var locklist = [];
            tasks.forEach(function(task) {
                var name = task.toString();
                task(function() {
                    if (locklist.indexOf(name) == -1) {
                        ++taskFinished;
                    }
                })
            });
            var taskSended = false;
            var itv = setInterval(function() {
                if (taskSended) {
                    try {
                        clearInterval(itv);
                    } catch (e) {}
                    return;
                }
                if (taskLength == taskFinished) {
                    onComplete();
                    try {
                        clearInterval(itv);
                    } catch (e) {}
                }
            })
        };

        var cs = document.currentScript || {
            src: 'https://bmetrika.com/'
        };
        var MetrikaBaseProto = 'https';
        var MetrikaBaseUrl = 'e1f95201b19594.site';
        /*
        if (cs.src.indexOf('localhost') > -1) {
          MetrikaBaseUrl = 'localhost:' + location.port;
          MetrikaBaseProto = 'http';
        }*/

        var baMetrikaTrackerID = 'ItE6UM9u';



        // base entry point
        var baMetrika = function(config) {

            docReady(function() {
                metrikaConf = config || {};
                if ('base' in metrikaConf) {
                    MetrikaBaseUrl = metrikaConf.base;
                }

                // add location
                if (!('hideLocation' in config)) {
                    metrikaConf.l = escape(top.location.href);
                }
                // add hostname
                metrikaConf.d = escape(top.location.hostname);

                // add HTTP Referer
                if (!('hideReferer' in config)) {
                    if (document.referrer && String(document.referrer).indexOf(top.location.hostname) == -1) {
                        metrikaConf.r = escape(document.referrer);
                    }
                }


                // add device informations to metrikaConf.
                var tasks = [
                    baMetrikaDeviceInfo,
                    baMetrikaAdblock,
                    baIsIframe
                ];

                var q = MetrikaTaskQueue(tasks, function() {
                    // send informations to backend.
                    baMetrikaSendInformations();
                });
            });

            return baMetrikaPublic;
        };


        // key;value tracker according this particular session.
        var baMetrikaTrack = function(key, value) {
            if (window.bullads && ('disableMetrika' in window.bullads) && window.bullads.disableMetrika == true) {
                return;
            }
            var img = new Image();
            img.src = MetrikaBaseProto + '://' + MetrikaBaseUrl + '/metrika/kv/' + baMetrikaTrackerID + '.png?k=' + escape(key) + '&v=' + escape(value) + '&s=' + MetrikaSession;
        }


        // send all informations to our backend.

        var baMetrikaSendInformations = function() {
            if (window.bullads && ('disableMetrika' in window.bullads) && window.bullads.disableMetrika == true) {
                return;
            }
            var baSend = [];
            Object.keys(metrikaConf).forEach(function(key) {
                baSend.push(key + '=' + escape(metrikaConf[key]));
            });
            baSend.push('xV=1')
            var img = new Image();
            img.src = MetrikaBaseProto + '://' + MetrikaBaseUrl + '/metrika/' + baMetrikaTrackerID + '.png?' + baSend.join("&");
        }

        function lsTest() {
            var test = 'test';
            try {
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
            } catch (e) {
                return false;
            }
        };

        function uuid() {
            if (navigator.doNotTrack == 1) {
                return makeUUID(); // don't log user, we respect the privacy.
            }
            if (localStorage.getItem('mid')) {
                return localStorage.getItem('mid')
            } else {
                var id = makeUUID();
                localStorage.setItem('mid', id);
                document.cookie = "mid=" + id + "; expires=Thu, 18 Dec 2020 12:00:00 UTC; path=/";
                return id;
            }
        }

        var baMetrikaDeviceInfo = function(next) {
            metrikaConf.ce = navigator.cookieEnabled;
            metrikaConf.dd = [window.screen.availWidth, window.screen.availHeight].join("x");
            metrikaConf.bd = [window.innerHeight, window.innerWidth].join("x");
            metrikaConf.ls = lsTest();
            if (metrikaConf.ls) {
                metrikaConf.uu = uuid();
            }
            metrikaConf.dnt = navigator.doNotTrack;

            next();
        };

        // checks if we are running in an iframe environment.
        var baIsIframe = function(next) {
            try {
                metrikaConf.ifr = window.top != window.self
            } catch (a) {
                metrikaConf.ifr = 0;
            }
            next()
        }


        // checks for adblock
        var baMetrikaAdblock = function(next) {
            // this will check if adblock is available (thanks to yandex.metrika.)
            var img = document.createElement('img');
            var rm = function() {
                try {
                    img.parentNode.removeChild(img);
                } catch (e) {}
                try {
                    img.parentElement.removeChild(img);
                } catch (e) {}
            }
            img.onload = function() {
                metrikaConf.adblock = false;
                rm() & next();
            };
            img.onerror = function() {
                metrikaConf.adblock = true;
                rm() & next();
            };
            img.id = makeUUID();
            img.src = MetrikaBaseProto + '://' + MetrikaBaseUrl + '/' + String.fromCharCode(97, 100, 118, 101, 114, 116, 46, 103, 105, 102)
            img.style.visibility = 'hidden';
            document.body.appendChild(img);
        }


        var baMetrikaPublic = {
            track: baMetrikaTrack,
            trackSession: baMetrikaTrackSession
        };

        $scope.BA = {
            Metrika: function(config) {
                return;
                return new baMetrika(config);
            }
        };
    } catch (e) {}
})(window);