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

router.get('/', function(req, res, next) {
  res.redirect( "processmetrics/bug_cats" );
});

router.post( '/load', function( req, res, next ) {
  // see middleware in routes/index.js
  var uiSettings = req.body.uiSettings;
  var currentView = uiSettings.globalSettings.currentView;

  var project = uiSettings.globalSettings.project;

  var data = { };
  var pmBody = "";

  if( project && project.dictionary &&
    project.dictionary.context !== "bug" && project.dictionary.context !== "all" ) {

    data.message = "No data for current dictionary! Use a 'bug' dictionary!";

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

    pmBody = Util.getPartialByName( "processmetrics_tabs", data );

    getUsers( project, currentView ).then( users => {
      if( users && users.length > 0 ) {
        uiSettings.partials.users = Util.getPartialByName( "users", { users: users } );
      }

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

    if( currentView.nav == "processmetrics" && currentView.tab ) {
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
    case "bcatsauthor":
    case "bstatuser":
    case "bugsuser":
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
      break;

    case "commentsuser":
      if( project.dictionary && project.dictionary.context != "all" ) {
        if( project.year && project.year != "all" ) {
          defaults.query += " AND cat.dictionary = ? "
            + " AND CAST(strftime('%Y', Comments.creation) AS INTEGER) = ? ";
          defaults.params.push( project.dictionary.id );
          defaults.params.push( project.year );

        } else {
          defaults.query += " AND cat.dictionary = ? ";
          defaults.params.push( project.dictionary.id );
        }
      } else {
        if( project.year && project.year != "all" ) {
          defaults.query += " AND CAST(strftime('%Y', Comments.creation) AS INTEGER) = ? ";
          defaults.params.push( project.year );
        } else {
          // default query & params
        }
      }
      break;

    case "patchesuser":
      if( project.dictionary && project.dictionary.context != "all" ) {
        if( project.year && project.year != "all" ) {
          defaults.query += " AND cat.dictionary = ? "
            + " AND CAST(strftime('%Y', attDet.attCreationTime) AS INTEGER) = ? ";
          defaults.params.push( project.dictionary.id );
          defaults.params.push( project.year );

        } else {
          defaults.query += " AND cat.dictionary = ? ";
          defaults.params.push( project.dictionary.id );
        }
      } else {
        if( project.year && project.year != "all" ) {
          defaults.query += " AND CAST(strftime('%Y', attDet.attCreationTime) AS INTEGER) = ? ";
          defaults.params.push( project.year );
        } else {
          // default query & params
        }
      }
      break;

    default: defaults;
  }

  defaults.query += " ORDER BY username";

  return { query: defaults.query, params: defaults.params };
};

function getUserQueryDefaults( project, tab ) {
  var defaults = { query: "", params: [ ] };

  if( tab === "bcatsauthor" || tab === "bstatuser" || tab === "bugsuser" ) {
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
  else if( tab === "commentsuser" ) {
    defaults.query = "SELECT DISTINCT u.name as username, "
      + " u.id as uid, "
      + " i.id as iid, "
      + " i.name as iname, "
      + " i.context as icontext "
      + "FROM "
      + " Users u, Identities i, Bugs b, BugCategories bc, Categories cat, Components comp, Comments "
      + "WHERE u.id = i.user "
      + " AND b.id = bc.bug "
      + " AND b.id = Comments.bug "
      + " AND bc.category = cat.id "
      + " AND b.identity = i.id "
      + " AND comp.id = b.component "
      + " AND comp.project = ? ";
    defaults.params = [ project.id ];
  }
  else if( tab === "issuesattribute" ) {
    // TODO
  }
  else if( tab === "patchesuser" ) {
    defaults.query = "SELECT DISTINCT u.name as username, "
      + " u.id as uid, "
      + " i.id as iid, "
      + " i.name as iname, "
      + " i.context as icontext "
      + "FROM "
      + " Users u, Identities i, Bugs b, BugCategories bc, Categories cat, Components comp, "
      + " Comments, Attachments atts, AttachmentDetails attDet "
      + "WHERE u.id = i.user "
      + " AND b.id = bc.bug "
      + " AND b.id = Comments.bug "
      + " AND Comments.id = atts.comment "
      + " AND attDet.attachment = atts.id "
      + " AND attDet.isPatch = 1 "
      + " AND bc.category = cat.id "
      + " AND b.identity = i.id "
      + " AND comp.id = b.component "
      + " AND comp.project = ? ";
    defaults.params = [ project.id ];
  }

  return defaults;
};

module.exports = router;
