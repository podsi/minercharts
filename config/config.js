var _ = require('lodash');
var nconf = require('nconf');
var fs = require('fs');
var delKey = require('key-del')

function getDefaultsConfig() {
  nconf.file('defaultsConfig', {
    file: 'main.json',
    dir: 'config',
    search: true
  } );

  return nconf.get( "defaults" );
};

function getDBConfig() {
  nconf.file('dbConfig', {
    file: 'main.json',
    dir: 'config',
    search: true
  } );

  return nconf.get( "db" );
};

function getExpressConfig() {
  nconf.file('expressConfig', {
    file: 'main.json',
    dir: 'config',
    search: true
  } );

  return nconf.get( "express" );
};

module.exports = {
  DB: getDBConfig( ),
  DEFAULTS: getDefaultsConfig( ),
  EXPRESS: getExpressConfig( ),
  UI: {
    rootKey: "ui",
    path: getDefaultsConfig( ).uiSettingsPath,

    load: function( ) {
      var loadPromise = new Promise( function( resolve, reject ) {
        if( !fs.existsSync( this.path ) ) {
          fs.writeFileSync( this.path, JSON.stringify( {}, null, 2) );

          resolve( {} );
        }

        fs.readFile( this.path, function( err, data ) {
          if( err ) throw err;

          try {
            resolve( JSON.parse( data ) );
          } catch( e ) {
            reject( console.log( e ) );
          }
        }.bind( this ) );
      }.bind( this ) );

      return loadPromise;
    },

    save: function( settings ) {
      var savePromise = new Promise( function( resolve, reject ) {
        fs.writeFile( this.path, JSON.stringify( settings, null, 2 ), function( err ) {
          if( err ) throw err;
          console.log('Configuration saved successfully.');

          resolve( settings );
        }.bind( this ) );
      }.bind( this ) );

      return savePromise;
    },

    get: function( key ) {
      return new Promise( function( resolve, reject ) {
        this.load( ).then( function( obj ) {
          var newObj = _.get( obj, key );

          resolve( newObj );
        } );
      }.bind( this ) );
    },

    set: function( opts ) {
      return new Promise( function( resolve, reject ) {
        this.load( ).then( function( obj ) {
          obj = this.setConfig( opts, obj );

          this.save( obj ).then( function( settings ) {
            resolve( settings );
          }.bind( this ) );
        }.bind( this ) );
      }.bind( this ) );
    },

    remove: function( key ) {
      this.load( ).then( function( obj ) {
        obj = delKey( obj, key );

        this.save( obj ).then( function( settings ) {
          return settings;
        }.bind( this ) );
      }.bind( this ) );
    },

    setConfig: function( config, settings ) {
      _.each( config, function( value, key ) {
        _.set( settings, key, value );
      } );

      return settings;
    }
  }

};
