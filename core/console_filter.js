(function () {
    var originalError = console.error;
    var originalWarn = console.warn;

    // Suppress any message containing one of these phrases, regardless of source
    var suppressedPhrases = [
        "was not found with",           // catches all "Module X was not found with ..." from WPP
        "func is not a function",        // WPP internal callsite failures
        "ErrorUtils caught an error",    // WhatsApp's own error boundary logs from wppconnect
    ];

    // Suppress any error/warning whose call stack originates from these files
    var suppressedSources = [
        "wppconnect-wa.js",
    ];

    function buildMsg(arg) {
        try {
            if (typeof arg === 'string') return arg;
            if (arg && arg.message) return arg.message + (arg.stack || '');
            if (arg && typeof arg.toString === 'function') return arg.toString();
        } catch (e) {}
        return '';
    }

    function shouldSuppress(args) {
        try {
            if (!args || args.length === 0) return false;

            // 1. Check if args contain a suppressed phrase
            for (var j = 0; j < args.length; j++) {
                var msg = buildMsg(args[j]);
                for (var i = 0; i < suppressedPhrases.length; i++) {
                    if (msg.indexOf(suppressedPhrases[i]) !== -1) return true;
                }
            }

            // 2. Check the call stack for suppressed source files
            var stack = new Error().stack || '';
            for (var k = 0; k < suppressedSources.length; k++) {
                if (stack.indexOf(suppressedSources[k]) !== -1) return true;
            }
        } catch (e) {
            // never suppress due to filter errors
        }
        return false;
    }

    console.error = function () {
        if (shouldSuppress(arguments)) return;
        originalError.apply(console, arguments);
    };

    console.warn = function () {
        if (shouldSuppress(arguments)) return;
        originalWarn.apply(console, arguments);
    };

    // -----------------------------------------------------------------
    // Suppress uncaught exceptions from known-broken third-party files.
    // These are native browser error reports that bypass console.error,
    // so we must intercept them at the window level.
    // -----------------------------------------------------------------
    window.addEventListener('error', function (e) {
        if (e && e.filename && e.filename.indexOf('wppconnect-wa.js') !== -1) {
            e.preventDefault();   // stops the browser from logging it
            e.stopPropagation();
            return false;
        }
    }, true /* capture phase — runs before browser's own handler */);

    // Same for unhandled promise rejections from the same source
    window.addEventListener('unhandledrejection', function (e) {
        var stack = (e && e.reason && e.reason.stack) || '';
        if (stack.indexOf('wppconnect-wa.js') !== -1) {
            e.preventDefault();
            return false;
        }
    }, true);

})();
