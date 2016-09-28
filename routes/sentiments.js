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
  res.redirect( "sentiments/commit_sentiment" );
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

    data.message = "No data for current dictionary! Use a 'src' dictionary!";

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

    pmBody = Util.getPartialByName( "sentiments_tabs", data );

    var usersPromise = getUsers( project, currentView );
    var catsPromise = getCategories( project, currentView );
    var users = { };
    var cats = { };

    Promise.all( [ usersPromise, catsPromise ] ).then( values => {
      users = values[ 0 ];
      cats = values[ 1 ];

      if( users && users.length > 0 ) {
        uiSettings.partials.users = Util.getPartialByName( "users", { users: users } );
      }

      if( cats && cats.length > 0 ) {
        uiSettings.partials.cats = Util.getPartialByName( "categories", { cats: cats } );
      }

      uiSettings.partials.pmBody = pmBody;

      res.status( 200 ).send(
        {
          success: true,
          partials: uiSettings.partials,
          globalSettings: uiSettings.globalSettings
        }
      );

    } ).catch( reason => {
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

function getCategories( project, currentView ) {
  var catsPromise = new Promise( (resolve, reject) => {
    var catsQuery = getCatsQuery( project, currentView );

    if( catsQuery ) {
      var select = catsQuery.select || "";
      var conditions = catsQuery.conditions || "";
      var end = catsQuery.end || "";
      var params = catsQuery.params || [ ];

      var query = select + conditions + end;

      if( query.length > 0 && params.length > 0 ) {
        db.all( query, params, function( err, cats ) {
          if( err ) {
            console.log( err );
            reject( err );
          }

          if( cats.length > 0 ) {
            resolve( cats );
          } else {
            reject( "Couldn't find any categories!" );
          }
        } );
      }
    }
  } );

  return catsPromise;
};

function getCatsQuery( project, currentView ) {
  var query = {
    select: "SELECT "
      + " Categories.id, Categories.name "
      + "FROM "
      + " Commits, CommitCategories, Categories, Dictionary ",
    conditions: "WHERE "
      + " Commits.id=CommitCategories.commitId "
      + " AND CommitCategories.category=Categories.id "
      + " AND Commits.project = ? "
      + " AND Categories.dictionary = ? ",
    params: [ project.id, project.dictionary.id ]
  };

  query.end = " GROUP BY CommitCategories.category ";

  return query;
};

function getUsers( project, currentView ) {
  var usersPromise = new Promise( (resolve, reject) => {
    var query = "";
    var params = [ ];

    if( currentView.nav == "productmetrics" && currentView.tab ) {
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
    case "comsentiment":
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

  if( tab === "comsentiment" ) {
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
  // else if( tab === "comsentiment" ) {
  //   // TODO
  // }

  return defaults;
};

module.exports = router;