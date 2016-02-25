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

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.redirect( "productmetrics/commit_user" );
});

router.post( '/load', function( req, res, next ) {
  // see middleware in routes/index.js
  var uiSettings = req.body.uiSettings;
  var currentView = req.body.currentView;

  var project = uiSettings.globalSettings.project;

  var data = { };
  var pmBody = "";

  if( project && project.dictionary &&
    project.dictionary.context !== "src" && project.dictionary.context !== "all" ) {

    data.message = "No data for current dictionary! Use a src dictionary or all!";

    uiSettings.partials.pmBody = Util.getPartialByName( "info", data );

    res.status( 200 ).send(
      {
        success: true,
        partials: uiSettings.partials,
        globalSettings: uiSettings.globalSettings
      }
    );
  } else {
    if( currentView.tab ) {
      data[ currentView.tab ] = "active";
    }

    pmBody = Util.getPartialByName( "productmetrics_tabs", data );

    getUsers( project, currentView ).then( users => {
      if( users && users.length > 0 ) {
        uiSettings.partials.users = Util.getPartialByName( "users", { users: users } );
      }

      console.log( "uuuuuuuuuuuuuuuserssss", users );

      uiSettings.partials.pmBody = pmBody;

      res.status( 200 ).send(
        {
          success: true,
          partials: uiSettings.partials,
          globalSettings: uiSettings.globalSettings
        }
      );

    }, reason => {
      var html = Util.getPartialByName( "info", { message: reason } );

      res.status( 200 ).send( {
        success: false,
        message: html,
        partials: uiSettings.partials,
        globalSettings: uiSettings.globalSettings
      } );
    } );
  }

});

function getUsers( project, currentView ) {
  var usersPromise = new Promise( (resolve, reject) => {
    var query = "";
    var params = [ ];

    console.log( "0000000000000000000000000000000000000000" );
    console.log( "project", project );
    console.log( "currentView", currentView );

    if( currentView.nav == "productmetrics" && currentView.tab ) {
      console.log( "11111111111111111111111111111111111" );
      var userQuery = getUserQuery( project, currentView.tab );

      query = userQuery.query || "";
      params = userQuery.params || [ ];
    }

    if( query !== "" && params.length > 0 ) {
      db.all( query, params, function( err, users ) {
        if( err ) {
          console.log( err );
          reject( err );
        }

        if( users.length > 0 ) {
          resolve( users );
        } else {
          reject( "Couldn't find any users!" );
        }
      } ) ;
    } else {
      reject( "Couldn't find any users!" );
    }
  } );

  return usersPromise;
};

function getUserQuery( project, tab ) {
  var defaults = getUserQueryDefaults( project, tab );

  switch( tab ) {
    case "comuser":
      if( project.dictionary && project.dictionary.context != "all" ) {
        if( project.year && project.year != "all" ) {
          defaults.query += " AND cat.dictionary = ? "
            + " AND CAST(strftime('%Y', c.date) AS INTEGER) = ? ";
          defaults.params.push( project.dictionary.id );
          defaults.params.push( project.year );

        } else {
          defaults.query += " AND cat.dictionary = ? ";
          defaults.params.push( project.dictionary.id );
        }
      } else {
        if( project.year && project.year != "all" ) {
          defaults.query += " AND CAST(strftime('%Y', c.date) AS INTEGER) = ? ";
          defaults.params.push( project.year );
        } else {
          // default query & params
        }
      }
      defaults.query += " ORDER BY username";
      break;

    default: defaults;
  }

  return { query: defaults.query, params: defaults.params };
};

function getUserQueryDefaults( project, tab ) {
  var defaults = { query: "", params: [ ] };

  if( tab === "comuser" ) {
    defaults.query = "SELECT DISTINCT u.name as username, "
      + " u.id as uid, "
      + " i.id as iid, "
      + " i.name as iname, "
      + " i.context as icontext "
      + "FROM "
      + " Users u, Identities i, Commits c, Categories cat, CommitCategories cc "
      + "WHERE u.id = i.user "
      + " AND cat.id = cc.category "
      + " AND c.id = cc.commitId "
      + " AND c.author = i.id "
      + " AND c.project = ? ";

    defaults.params = [ project.id ];
  }
  else if( tab === "commodule" ) {
    // TODO
  }
  else if( tab === "comsentiment" ) {
    // TODO
  }
  else if( tab === "comloc" ) {
    // TODO
  }

  return defaults;
};

module.exports = router;
