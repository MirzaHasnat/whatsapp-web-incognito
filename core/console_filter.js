(function () {
    var originalError = console.error;
    var originalWarn = console.warn;

    var suppressedPhrases = [
        "Module getIsMyContact was not found",
        "Module getMentionName was not found",
        "Property getSearchVerifiedName was not found",
        "Property getHeader was not found",
        "Module MsgCollection was not found",
        "Module not found: function(e)",
    ];

    function shouldSuppress(args) {
        try {
            if (!args || !args[0] || typeof args[0] !== 'string') return false;
            var msg = args[0];

            for (var i = 0; i < suppressedPhrases.length; i++) {
                if (msg.includes(suppressedPhrases[i])) {
                    return true;
                }
            }
        } catch (e) {
            // ignore
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
})();
