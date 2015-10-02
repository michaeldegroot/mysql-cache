(function() {
  var NodeCache, _read, _write, idx, queriesCache;

  NodeCache = require('../');

  queriesCache = new NodeCache({
    stdTTL: 2,
    checkperiod: 1
  });

  idx = 0;

  _write = function() {
    console.log("test - WRITE:A query:" + idx);
    queriesCache.set("query", idx, function(err, success) {
      console.log("test - WRITE:B query:" + idx, err, success);
      idx++;
    });
  };

  _read = function() {
    console.log("test - read:A query");
    queriesCache.get("query", function(err, value) {
      if (value["query"] != null) {
        console.log("test - read:B query:" + value["query"]);
      } else {
        console.log("test - !! EMPTY !! - read:B query:" + value["query"]);
      }
    });
  };

  queriesCache.on("expired", function(key, value) {
    console.log("test - EXPIRED query:" + value);
    _write();
  });

  _write();

  setInterval(_read, 600);

}).call(this);
