var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var config = require('../config/config');
var hbs = require('hbs');
var Util = require('../helpers/util');
var Common = require('../models/common/Common');
var Bug = require( '../models/processmetrics/Bug' );
var Promise = require('bluebird');

// load the modern build
var _ = require('lodash');

var db = require( '../db/db' );
var queries = require( '../db/queries' );

router.get('/', function(req, res, next) {
  res.redirect( "processmetrics/bug_severities" );
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

    var usersPromise = getUsers( project, currentView );
    var promises = [ ];

    if( currentView.tab === "commentsuser" || currentView.tab === "bugsattribute" ) {
      var prioritiesP = Common.getPriorities( project );
      var severitiesP = Common.getSeverities( project );
      var resolutionsP = Common.getResolutions( project );
      var opsysP = Common.getOperationSystems( project );
      var platformsP = Common.getPlatforms( project );
      var versionsP = Common.getVersions( project );

      promises = [ usersPromise, prioritiesP, severitiesP, resolutionsP, opsysP, platformsP, versionsP ];
    } else if( currentView.tab === "bcatsauthor" ) {
      var bugCatsP = Common.getBugCategories( project );

      promises = [ usersPromise, bugCatsP ];
    } else {
      promises = [ usersPromise ];
    }

    Promise.all( promises ).then( values => {
      var users = values[ 0 ];

      if( users && users.length > 0 ) {
        uiSettings.partials.users = Util.getPartialByName( "users", { users: users } );
      }

      if( currentView.tab === "bcatsauthor" ) {
        var bcats = values[ 1 ];

        if( bcats && bcats.length > 0 ) {
          uiSettings.partials.bcats = Util.getPartialByName( "categories", { cats: bcats } );
        }
      }

      if( ( currentView.tab === "commentsuser" || currentView.tab === "bugsattribute" ) && values.length > 1 ) {
        var priorities = values[ 1 ];
        var severities = values[ 2 ];
        var resolutions = values[ 3 ];
        var opsys = values[ 4 ];
        var platforms = values[ 5 ];
        var versions = values[ 6 ];

        if( priorities && priorities.length > 0 ) {
          uiSettings.partials.priorities = Util.getPartialByName( "priorities", { priorities: priorities } );
        }

        if( severities && severities.length > 0 ) {
          uiSettings.partials.severities = Util.getPartialByName( "severities", { severities: severities } );
        }

        if( resolutions && resolutions.length > 0 ) {
          uiSettings.partials.resolutions = Util.getPartialByName( "resolutions", { resolutions: resolutions } );
        }

        if( opsys && opsys.length > 0 ) {
          uiSettings.partials.opsys = Util.getPartialByName( "opsys", { opsys: opsys } );
        }

        if( platforms && platforms.length > 0 ) {
          uiSettings.partials.platforms = Util.getPartialByName( "platforms", { platforms: platforms } );
        }

        if( versions && versions.length > 0 ) {
          uiSettings.partials.versions = Util.getPartialByName( "versions", { versions: versions } );
        }
      }

      uiSettings.partials.pmBody = pmBody;

      res.status( 200 ).send(
        {
          success: true,
          partials: uiSettings.partials,
          globalSettings: uiSettings.globalSettings
        }
      );

    } ).catch( msg => {
      console.log( "ERROR ------->", msg );
      var html = Util.getPartialByName( "info", { message: msg } );

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
    case "bugsattribute":
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

  if( tab === "bcatsauthor" || tab === "bstatuser" || tab === "bugsuser" || tab === "bugsattribute" ) {
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
