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
  res.redirect( "userprofiles/commits" );
});

router.post( '/load', function( req, res, next ) {
  // see middleware in routes/index.js
  var uiSettings = req.body.uiSettings;
  var currentView = req.body.currentView;
  var userprofiles = req.body.userprofiles;

  var project = uiSettings.globalSettings.project;

  var data = { };
  var pmBody = "";
  var dictContext;

  if( currentView.tab === "commits" ) {
    dictContext = "src";
  } else {
    dictContext = "bug";
  }

  if( project && project.dictionary &&
    project.dictionary.context !== dictContext && project.dictionary.context !== "all" ) {

    data.message = "No data for current dictionary! Use a '" + dictContext + "' dictionary!";

    if( currentView.tab ) {
      data[ currentView.tab ] = "active";
    }

    pmBody = Util.getPartialByName( "userprofiles_tabs", data );

    // uiSettings.partials.pmBody = Util.getPartialByName( "info", data );
    uiSettings.partials.pmBody = pmBody;

    res.status( 200 ).send(
      {
        success: true,
        message: data.message,
        partials: uiSettings.partials,
        globalSettings: uiSettings.globalSettings
      }
    );
  } else {
    if( currentView.tab ) {
      data[ currentView.tab ] = "active";
    }

    pmBody = Util.getPartialByName( "userprofiles_tabs", data );

    uiSettings.partials.pmBody = pmBody;

    res.status( 200 ).send(
      {
        success: true,
        partials: uiSettings.partials,
        globalSettings: uiSettings.globalSettings
      }
    );
  }

});

function activateTab( currentTab, context, data ) {
  if( currentTab ) {
    if( currentTab === "commits" ) {
      if( context === "src" ) {
        data[ "commits" ] = "active";
      } else {
        data[ "bugs" ] = "active";
      }
    } else if( currentTab === "bugs" ) {
      if( context === "bug" ) {
        data[ "bugs" ] = "active";
      } else {
        data[ "commits" ] = "active";
      }
    }
  }

  return data;
}

function getUsers( project, currentView ) {
  var usersPromise = new Promise( (resolve, reject) => {
    var query = "";
    var params = [ ];

    if( currentView.nav == "userprofiles" && currentView.tab ) {
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

        if( users && users.length > 0 ) {
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
    case "commits":
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
    case "bugs":
      if( project.dictionary && project.dictionary.context != "all" ) {
        if( project.year && project.year != "all" ) {
          defaults.query += " AND cat.dictionary = ? "
            + " AND CAST(strftime('%Y', b.creation) AS INTEGER) = ? ";
          defaults.params.push( project.dictionary.id );
          defaults.params.push( project.year );

        } else {
          defaults.query += " AND cat.dictionary = ? ";
          defaults.params.push( project.dictionary.id );
        }
      } else {
        if( project.year && project.year != "all" ) {
          defaults.query += " AND CAST(strftime('%Y', b.creation) AS INTEGER) = ? ";
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

  if( tab === "commits" ) {
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
  else if( tab === "bugs" ) {
    defaults.query = "SELECT DISTINCT u.name as username, "
      + " u.id as uid, "
      + " i.id as iid, "
      + " i.name as iname, "
      + " i.context as icontext "
      + "FROM "
      + " Users u, Identities i, Bugs b, BugCategories bc, Categories cat, Components comp "
      + "WHERE u.id = i.user "
      + " AND b.id = bc.bug "
      + " AND bc.category = cat.id "
      + " AND b.identity = i.id "
      + " AND comp.id = b.component "
      + " AND comp.project = ? ";
    defaults.params = [ project.id ];
  }

  return defaults;
};

module.exports = router;
