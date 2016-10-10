var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');
var config = require('../config/config');

var dbFile = config.DB.path;

fs.exists(dbFile, function(exists) {
	if(!exists) {
		console.log("Couldn't find db file " + dbFile);
		//TODO kill app
	}
});

//DB
db = new sqlite3.Database(dbFile);

console.log("db initialized");

// db.loadExtension( 'extension-functions.c' );

module.exports = {
  all: function(sql, params, callback) {
    console.log( "========================SQL=========================" );

    params = params || [ ];

    console.log( "QUERY: ", sql );
    console.log( "PARAMS: ", params );

    db.all(sql, params, callback);
  },

  close: function( ) {
    db.close( );
  },

  each: function(sql, params, callback, complete) {
    console.log( "========================SQL=========================" );

    params = params || [ ];

    console.log( "QUERY: ", sql );
    console.log( "PARAMS: ", params );

    db.each( sql, params, callback, complete );
  },

  run: function(sql, params, callback) {
    console.log( "========================SQL=========================" );

    params = params || [ ];

    console.log( "QUERY: ", sql );
    console.log( "PARAMS: ", params );

    db.run(sql, params, callback);
  },

  get: function(sql, params, callback) {
    console.log( "========================SQL=========================" );

    params = params || [ ];

    console.log( "QUERY: ", sql );
    console.log( "PARAMS: ", params );

    db.get(sql, params, callback);
  },

  serialize: function( fn ) {
    db.serialize( fn );
  },

  parallelize: function( fn ) {
    db.parallelize( fn );
  }
};

