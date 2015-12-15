var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var config = require('../config/config');

// load the modern build
var _ = require('lodash');

var db = require( '../db/db' );
var queries = require( '../db/queries' );

/* POST settings. */
router.post('/changed', function(req, res, next) {
  var pathname = req.body.pathname;
  var key = req.body.key;
  var value = req.body.value;
  var additional = req.body.additional;

  var uiOptions = { };
  uiOptions[ key ] = value;

  if( additional ) {
    _.merge( uiOptions, additional );
  }

  var newOpts = { };

  if( key === "project.id" ) {
    if( value < 0 ) {
      config.UI.remove( "project" );
      res.status( 200 ).send( { message: "No Project for given id " + value } );
    } else {
      config.UI.set( uiOptions ).then( function( settings ) {
        changedProject( settings.project.id ).then( function( newSettings ) {
          changedSettings( req, res, newSettings );
        } );
      } );
    }
  } else if( key === "project.dictionary.id" && value > 0 ) {
    config.UI.set( uiOptions ).then( function( settings ) {
      var pid = settings.project.id;
      var dictContext = settings.project.dictionary.context;

      changedDictionary( pid, dictContext ).then( function( newSettings ) {
        changedSettings( req, res, newSettings );
      } );
    } );
  } else {
    config.UI.set( uiOptions ).then( function( settings ) {
      changedSettings( req, res, settings );
    } );
  }
});

function changedSettings( req, res, settings ) {
  var pathname = req.body.pathname;
  if( pathname === "/" ) pathname = "index";

  res.status( 200 ).send( { success: true } );
}

function changedProject( pid ) {
  return new Promise( function( resolve, reject ) {
    loadDictionaries( pid ).then( function( dicts ) {
      config.UI.set( { "project.dictionaries": dicts } ).then( function( settings ) {
        resolve( settings );
      } );
    } );
  } );
}

function changedDictionary( pid, dictContext ) {
  return new Promise( function( resolve, reject ) {
    loadUsers( pid, dictContext ).then( function( users ) {
      config.UI.set( { "project.users": users } ).then( function( settings ) {
        resolve( settings );
      } );
    } );
  } );
}

function loadDependencies( pid ) {
  return new Promise( function( resolve, reject ) {
    var settings = { };

    loadDictionaries( pid ).then( function( dicts ) {
      settings[ "project.dictionaries" ] = dicts;

      loadUsers( pid ).then( function( users ) {
        settings[ "project.users" ] = users;

        resolve( settings );
      } );
    } );
  } );
}

function loadDictionaries( pid ) {
  var dictsPromise = new Promise( function( resolve, reject ) {
    db.all( queries.SELECT_DICTIONARIES, [ pid ], function( err, dicts ) {
      if( err ) {
        console.log( err );
      }

      resolve( dicts );
    } );
  } );

  return dictsPromise;
}

function loadUsers( pid, dictContext ) {
  dictContext = dictContext || null;

  var usersPromise = new Promise( function( resolve, reject ) {
    db.all( queries.SELECT_ALL_IDENTITIES, [ pid, dictContext ], function( err, users ) {
      if( err ) {
        console.log( err );
      }

      resolve( users );
    } );
  } );

  return usersPromise;
}

module.exports = router;
