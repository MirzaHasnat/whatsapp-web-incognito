/* moduleRaid v5
 * https://github.com/@pedroslopez/moduleRaid
 *
 * Copyright pixeldesu, pedroslopez and other contributors
 * Licensed under the MIT License
 * https://github.com/pedroslopez/moduleRaid/blob/master/LICENSE
 */

const moduleRaid = function () {
  moduleRaid.mID  = Math.random().toString(36).substring(7);
  moduleRaid.mObj = {};

  fillModuleArray = function() {
    // Strategy 1: try known chunk names first (fast path)
    var knownNames = [
        "webpackChunkwhatsapp_web_client",
        "webpackChunkwhatsapp_web",
        "webpackChunk",
    ];
    var chunkName = null;
    for (var n = 0; n < knownNames.length; n++) {
        if (typeof window[knownNames[n]] !== 'undefined' && Array.isArray(window[knownNames[n]])) {
            chunkName = knownNames[n];
            break;
        }
    }

    // Strategy 2: scan window for any webpackChunk-prefixed array (future-proof)
    if (!chunkName) {
        try {
            var keys = Object.keys(window);
            for (var k = 0; k < keys.length; k++) {
                if (keys[k].indexOf('webpackChunk') === 0 && Array.isArray(window[keys[k]])) {
                    chunkName = keys[k];
                    break;
                }
            }
        } catch(e) { /* sandbox may restrict Object.keys(window) */ }
    }

    if (chunkName) {
        window[chunkName].push([
            [moduleRaid.mID], {}, function(e) {
                Object.keys(e.m).forEach(function(mod) {
                    try { moduleRaid.mObj[mod] = e(mod); } catch(_) {}
                });
            }
        ]);
    }
    // Silently fail — exposeWhatsAppInternals retries every 1 s until found
  }

  fillModuleArray();

  get = function get (id) {
    return moduleRaid.mObj[id]
  }

  findModule = function findModule (query) {
    results = [];
    modules = Object.keys(moduleRaid.mObj);

    modules.forEach(function(mKey) {
      mod = moduleRaid.mObj[mKey];

      if (typeof mod !== 'undefined') {
        if (typeof query === 'string') {
          if (typeof mod.default === 'object') {
            for (key in mod.default) {
              if (key == query) results.push(mod);
            }
          }

          for (key in mod) {
            if (key == query) results.push(mod);
          }
        } else if (typeof query === 'function') { 
          if (query(mod)) {
            results.push(mod);
          }
        } else {
          throw new TypeError('findModule can only find via string and function, ' + (typeof query) + ' was passed');
        }
        
      }
    })

    return results;
  }

  return {
    modules: moduleRaid.mObj,
    constructors: moduleRaid.cArr,
    findModule: findModule,
    get: get
  }
}