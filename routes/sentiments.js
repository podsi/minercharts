var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var config = require('../config/config');
var hbs = require('hbs');
var Util = require('../helpers/util');
var Sentiment = require('../models/sentiments/Sentiment');
var Common = require('../models/common/Common');
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
  var dictContext;

  if( currentView.tab === "comsentiment" ) {
    dictContext = "src";
  } else {
    dictContext = "bug";
  }

  if( project && project.dictionary &&
    project.dictionary.context !== dictContext && project.dictionary.context !== "all" ) {

    data.message = `No data for current dictionary! Use a '${dictContext}' dictionary!`;

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
    var promises = [ ];

    if( currentView.tab === "bugcommentsentiment" ) {
      var prioritiesP = Common.getPriorities( project );
      var severitiesP = Common.getSeverities( project );
      var resolutionsP = Common.getResolutions( project );
      var opsysP = Common.getOperationSystems( project );
      var platformsP = Common.getPlatforms( project );
      var versionsP = Common.getVersions( project );

      promises = [ usersPromise, prioritiesP, severitiesP, resolutionsP, opsysP, platformsP, versionsP ];
    } else {
      promises = [ usersPromise ];
    }

    Promise.all( promises ).then( values => {
      var users = values[ 0 ];

      if( currentView.tab === "bugcommentsentiment" && values.length > 1 ) {
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

function getCategories( project, currentView ) {
  var catsPromise = new Promise( (resolve, reject) => {
    if( !project || !project.id ) {
      return reject( "No project (project ID) selected!" );
    }

    if( project.dictionary && project.dictionary.id ) {
      var catsQuery = getCatsQuery( project, currentView );

      if( catsQuery ) {
        var select = catsQuery.select || "";
        var conditions = catsQuery.conditions || "";
        var end = catsQuery.end || "";
        var params = catsQuery.params || [ ];

        var query = select + conditions + end;
        console.log( "=======queryyyyyyyyyyy=======================" );
        console.log( query );

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
    } else {
      reject( "No dictionary (dictionary ID) selected!" );
    }
  } );

  return catsPromise;
};

function getCatsQuery( project, currentView ) {
  switch( currentView.tab ) {
    case "comsentiment":
      var query = {
        select: `SELECT
          Categories.id, Categories.name
          FROM
          Commits, CommitCategories, Categories, Dictionary`,
        conditions: `
          WHERE
            Commits.id=CommitCategories.commitId
            AND CommitCategories.commitId=Categories.id
            AND Commits.project = ?
            AND Categories.dictionary = ? `,
        params: [ project.id, project.dictionary.id ]
      };

      query.end = "GROUP BY CommitCategories.commitId";
      break;
    case "bugcommentsentiment":
      var query = {
        select: `SELECT 
          Categories.id, Categories.name
          FROM 
          Bugs, BugCategories, Categories, Components`,
        conditions: `
        WHERE
          Bugs.id = BugCategories.bug
          AND BugCategories.category = Categories.id
          AND Components.id = Bugs.component
          AND Components.project = ?
          AND Categories.dictionary = ?`,
        params: [ project.id, project.dictionary.id ]
      };

      query.end = " GROUP BY BugCategories.category ";
      break;      
  }

  return query;
};

function getUsers( project, currentView ) {
  var usersPromise = new Promise( (resolve, reject) => {
    var query = "";
    var params = [ ];

    if( currentView.nav == "sentiments" && currentView.tab ) {
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
    case "comsentiment" || "bugcommentsentiment":
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
  else if( tab === "bugcommentsentiment" ) {
    defaults.query = `SELECT DISTINCT u.name as username, 
      u.id as uid,
      i.id as iid,
      i.name as iname,
      i.context as icontext
      FROM
      Users u, Identities i, Bugs b, Categories cat, BugCategories bc, Comments, Sentiment s, BugCommentSentiment bcs, Projects p
      WHERE u.id = i.user
      AND b.id = bc.bug
      AND b.id = Comments.bug
      AND b.identity = i.id
      AND bcs.sentimentId = s.id
      AND bcs.commentId = Comments.id 
      AND cat.id = bc.category
      AND p.id = ?`

    defaults.params = [ project.id ];
  }
  // else if( tab === "comsentiment" ) {
  //   // TODO
  // }

  return defaults;
};

module.exports = router;