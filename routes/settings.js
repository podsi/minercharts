var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var config = require('../config/config');
var hbs = require('hbs');
var Util = require('../helpers/util');
var Promise = require('bluebird');

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

  var project = req.body.project;
  var currentView = req.body.currentView;

  console.log( "============CHANGED SETTINGS============" );
  console.log( req.body.uiSettings.globalSettings );

  var globalSettings = {
    project: project,
    currentView: currentView
  };

  var uiOptions = { };
  uiOptions[ key ] = value;

  if( additional ) {
    _.merge( uiOptions, additional );
  }

  var newOpts = { };

  if( key === "project.id" ) {
    if( value < 0 ) {
      res.status( 200 ).send( { message: "No Project for given id " + value } );
    } else {
      let promises = [ config.UI.get( "projects" ) ];

      if( currentView.nav === "processmetrics" ) {
        promises.push( loadProjectYears( value ) );
      } else {
        promises.push( loadDictionaries( value ) );
      }
      // var yearsP = loadProjectYears( value );

      Promise.all( promises ).then( values => {
        var projects = values[ 0 ];
        var prop = "";

        _.extend( globalSettings, { projects: projects } );

        if( currentView.nav === "processmetrics" ) {
          prop = "years";
        } else {
          prop = "dictionaries";
        }

        globalSettings.project[ prop ] = values[ 1 ];

        changedSettings( req, res, globalSettings );
      } );

    }
  } else if( key === "project.dictionary.id" && value > 0 ) {
    config.UI.get( "projects" ).then( projects => {
      var pid = globalSettings.project.id;
      var dict = globalSettings.project.dictionary;

      // loadUsers( pid, dict.context ).then( users => {
      //   _.extend( globalSettings, { projects: projects } );
      //   globalSettings.project.users = users;

      //   changedSettings( req, res, globalSettings );
      // } );

      loadDictYears( pid, dict, currentView ).then( years => {
        _.extend( globalSettings, { projects: projects } );
        globalSettings.project.years = years;

        changedSettings( req, res, globalSettings );
      } );
    } );

  } else {

    config.UI.get( "projects" ).then( projects => {
      _.extend( globalSettings, { projects: projects } );

      changedSettings( req, res, globalSettings );
    } );

  }
});

function changedSettings( req, res, globalSettings ) {
  console.log( "changedSettings================================" );
  console.log( globalSettings );

  var pathname = req.body.pathname;
  if( pathname === "/" ) pathname = "index";

  var html = Util.getPartialByName( "global_settings", globalSettings );

  res.status( 200 ).send( { success: true, partial: html, globalSettings: globalSettings } );
}

function changedProject( pid ) {
  return new Promise( function( resolve, reject ) {
    loadDictionaries( pid ).then( function( dicts ) {
      config.UI.set( { "project.dictionaries": dicts } ).then( resolve );
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

function loadProjectYears( pid ) {
  var yearPromise = new Promise( function( resolve, reject ) {
    db.all( queries.SELECT_COMMIT_YEARS_BY_PROJECT, [ pid ], (err, years) => {
      if( err ) {
        console.log( err );
        reject( err );
      }

      resolve( years );
    } );
  } );

  return yearPromise;
}

function loadDictYears( pid, dict, currentView ) {
  var query = "";

  if( dict.context == "bug" ) {
    query = queries.SELECT_BUG_YEARS_BY_PROJECT_AND_DICT;
  } else if( dict.context == "src" ) {
    query = queries.SELECT_COMMIT_YEARS_BY_PROJECT_AND_DICT;
  }

  var yearPromise = new Promise( function( resolve, reject ) {
    db.all( query, [ pid, dict.id ], (err, years) => {
      if( err ) {
        console.log( err );
        reject( err );
      }

      resolve( years );
    } );
  } );

  return yearPromise;
}

function loadDictionaries( pid ) {
  var dictsPromise = new Promise( function( resolve, reject ) {
    db.all( queries.SELECT_DICTIONARIES, [ pid ], function( err, dicts ) {
      if( err ) {
        console.log( err );
        reject( err );
      }

      resolve( dicts );
    } );
  } );

  return dictsPromise;
}

function loadUsers( pid, dictContext ) {
  dictContext = dictContext || null;

  var usersPromise = new Promise( function( resolve, reject ) {
    db.all( queries.SELECT_ALL_IDENTITIES_BY_PROJECT_AND_DICT_CONTEXT, [ pid, dictContext ], function( err, users ) {
      if( err ) {
        console.log( err );
        reject( err );
      }

      resolve( users );
    } );
  } );

  return usersPromise;
}

module.exports = router;
