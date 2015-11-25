var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');
var config = require('../config');

var dbFile = config.db.path;

fs.exists(dbFile, function(exists) {
	if(!exists) {
		console.log("Couldn't find db file " + dbFile);
		//TODO kill app
	}
});

//DB
db = new sqlite3.Database(dbFile);

console.log("db initialized");

module.exports = {
  all: function(sql, params, callback) {
    params = params || [ ];
    db.all(sql, params, callback);
  },

  close: function( ) {
    db.close( );
  },

  each: function(sql, params, callback, complete) {
    params = params || [ ];
    db.each( sql, params, callback, complete );
  },

  run: function(sql, params, callback) {
    params = params || [ ];
    db.run(sql, params, callback);
  },

  serialize: function( fn ) {
    db.serialize( fn );
  }
};
