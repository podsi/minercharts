var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var fs = require('fs');
var hbs = require('hbs');
var Util = require('../helpers/util');
var Promise = require('bluebird');

var config = require('../config/config');

// load the modern build
var _ = require('lodash');

var db = require( '../db/db' );
var queries = require( '../db/queries' );

// require all routes (controllers)
var userProfiles = require('./userprofiles');
var upCommits = require('./userprofiles/commits');
var upBugs = require('./userprofiles/bugs');

var sentiments = require('./sentiments');
var commitsPerSentiment = require('./sentiments/commit_sentiment');

var processMetrics = require('./processmetrics');
var bugCategories = require('./processmetrics/bug_cats');
var bugStatus = require('./processmetrics/bug_status');
var commentsUser = require('./processmetrics/comments_user');
var bugsAttr = require('./processmetrics/bugs_attribute');
var bugsUser = require('./processmetrics/bugs_user');
var patchesUser = require('./processmetrics/patches_user');

var productMetrics = require('./productmetrics');
var commitsPerUser = require('./productmetrics/commit_user');
var commitsPerModule = require('./productmetrics/commit_module');
var locPerCommit = require('./productmetrics/commit_loc');

// used as a middleware
router.use( function( req, res, next ) {
  var currentView = req.body.currentView;
  var project = req.body.project;
  var dictContext = req.body.dictContext;

  if( project && project.years && currentView && currentView.nav == "overview" ) {
    delete project.years;
  }

  console.log( "==========MIDDLEWARE==========" );

  var globalSettings = {
    project: project,
    currentView: currentView,
    dictContext: dictContext
  };

  config.UI.get( "projects" ).then( projects => {
    _.extend( globalSettings, { projects: projects } );

    var partials = { };
    partials.globalSettings = Util.getPartialByName( "global_settings", globalSettings );

    req.body.uiSettings = {
      partials: partials,
      globalSettings: globalSettings
    };

    next( );
  } );
} );

// use the required routes
router.use( '/userprofiles', userProfiles );
router.use( '/userprofiles/commits', upCommits );
router.use( '/userprofiles/bugs', upBugs );

router.use( '/sentiments', sentiments );
router.use( '/sentiments/commit_sentiment', commitsPerSentiment );

router.use( '/processmetrics', processMetrics );
router.use( '/processmetrics/bug_cats', bugCategories );
router.use( '/processmetrics/bug_status', bugStatus );
router.use( '/processmetrics/comments_user', commentsUser );
router.use( '/processmetrics/bugs_attribute', bugsAttr );
router.use( '/processmetrics/bugs_user', bugsUser );
router.use( '/processmetrics/patches_user', patchesUser );

router.use( '/productmetrics', productMetrics );
router.use( '/productmetrics/commit_user', commitsPerUser );
router.use( '/productmetrics/commit_module', commitsPerModule );
router.use( '/productmetrics/commit_loc', locPerCommit );

router.use( '/settings', require('./settings') );

router.get('/', function(req, res, next) {
  db.serialize( function( ) {
    db.all( queries.SELECT_ALL_PROJECTS, [ ], function( err, projects ) {
      if( err ) {
        console.log( err );
        console.log( "ERROR" );
      }

      config.UI.set( { "projects": projects } ).then( function( settings ) {
        var data = {
          title: "Overview",
          ovactive: "active",
          globalchooseuser: "hidden"
        };

        _.extend( data, settings );

        res.render( 'index', data );
      } );
    } );
  } );

});

/* POST get data for project id. */
router.post('/project_overview', function(req, res, next) {
  var project = req.body.project;
  var projectId = project.id;

  // see middleware in routes/index.js
  var uiSettings = req.body.uiSettings;

  if( projectId < 0 ) {
    config.UI.remove( "project" );
    res.status( 200 ).send( { message: "No Project for given id " + projectId } );
  } else {
    config.UI.get( "projects" ).then( function( projects ) {
      var commitCats = { };
      var bugCats = { };
      var linkedCommits = { };
      var linkedBugs = { };

      db.serialize( function( ) {
        var ccp = getCommitCats( { project: project } );
        var bcp = getBugCats( uiSettings.globalSettings );
        var lcp = getLinkedCommits( uiSettings.globalSettings );
        var lbp = getLinkedBugs( uiSettings.globalSettings );

        Promise.all( [ ccp, bcp, lcp, lbp ] ).then( function( values ) {
          commitCats = values[ 0 ];
          bugCats = values[ 1 ];
          linkedCommits = values[ 2 ];
          linkedBugs = values[ 3 ];

          var data = {
            success: true,
            partials: uiSettings.partials,
            globalSettings: uiSettings.globalSettings
          };

          if( commitCats ) data.commitCats = commitCats;
          if( bugCats ) data.bugCats = bugCats;
          if( linkedCommits ) data.linkedCommits = linkedCommits;
          if( linkedBugs ) data.linkedBugs = linkedBugs;

          res.status( 200 ).send( data );

        } );
      } );
    } );
  }

});

function getCommitCats( globalSettings ) {
  var commitCatsPromise = new Promise( function( resolve, reject ) {
    var dict = null;
    var dictId = null;
    var committer = null;
    var query = "";
    var params = [ ];
    var pid = null;

    if( globalSettings.project && globalSettings.project.id ) {
      pid = globalSettings.project.id;
      dict = globalSettings.project.dictionary;

      if( dict ) {
        if( dict.context && dict.context != "src" && dict.context != "all" ) {
          resolve( null );
        }

        dictId = globalSettings.project.dictionary.id || "-1";
        dictId = dictId < 0 ? null : dictId;
      }

      if( globalSettings.project.user ) {
        committer = globalSettings.project.user.id || "-1";
        committer = committer < 0 ? null : committer;
      }

      if( dictId == null || committer == null ) {
        params = [ pid, pid, pid, pid ];
        query = queries.SELECT_ALL_COMMIT_CATEGORIES;
      } else {
        params = [ pid, pid, dictId, pid, pid ];
        query = queries.SELECT_COMMIT_CATEGORIES_BY_DICT;
      }
    } else {
      resolve( null );
    }

    db.all( query, params, function( err, cats ) {
      if( err ) {
        console.log( err );
        reject( err );
      }

      /**
       * render with handlebars template
       */
      // var template = hbs.handlebars.partials["commit_cats"];
      // template = hbs.compile( template );
      // var html = template(cats);

      // res.send( { partial: html } );

      var parsedCats = parseForPieChart( cats );

      var chartData = {
        series: {
          name: "Category",
          data: parsedCats.data
        },
        title: {
          text: "Commits by Categories"
        },
        subtitle: {
          text: "Total commits: " + parsedCats.total
        }
      };

      resolve( chartData );
    } ) ;
  } );

  return commitCatsPromise;
};

function getBugCats( globalSettings ) {
  var bugCatsPromise = new Promise( function( resolve, reject ) {
    var project;
    var dict;
    var dictId;

    if( globalSettings.project && globalSettings.project.id ) {
      project = globalSettings.project.id;
      dict = globalSettings.project.dictionary;

      if( dict ) {
        if( dict.context && dict.context != "bug" && dict.context != "all" ) {
          resolve( null );
        }

        dictId = dict.id || "-1";
        dictId = dictId < 0 ? null : dictId;
      }
    } else {
      resolve( null );
    }

    var query = queries.SELECT_BUG_CATEGORIES_BY_PROJECT;
    var params = [ project, project, project, project ];

    if( dictId ) {
      query = queries.SELECT_BUG_CATEGORIES_BY_PROJECT_AND_DICT;
      params = [ project, project, dictId, project, project, project, dictId ];
    }

    db.all( query, params, function( err, cats ) {
      if( err ) {
        console.log( err );
        reject( err );
      }

      var parsedCats = parseForPieChart( cats );

      var chartData = {
        series: {
          name: "Category",
          data: parsedCats.data
        },
        title: {
          text: "Bugs by Categories"
        },
        subtitle: {
          text: "Total bugs: " + parsedCats.total
        }
      };

      resolve( chartData );
    } ) ;
  } );

  return bugCatsPromise;
};

function getLinkedCommits( globalSettings ) {
  var linkedCommitsPromise = new Promise( function( resolve, reject ) {
    var project;
    var dict;
    var dictId;

    if( globalSettings.project && globalSettings.project.id ) {
      project = globalSettings.project.id;
      dict = globalSettings.project.dictionary;

      if( dict ) {
        if( dict.context && dict.context != "src" && dict.context != "all" ) {
          resolve( null );
        }

        dictId = globalSettings.project.dictionary.id || "-1";
        dictId = dictId < 0 ? null : dictId;
      }
    } else {
      resolve( null );
    }

    db.all( queries.SELECT_LINKED_COMMITS, [ project, project, project ], function( err, lc ) {
      if( err ) {
        console.log( err );
        reject( err );
      }

      var parsed = parseForPieChart( lc );

      var chartData = {
        series: {
          name: "Linked",
          data: parsed.data
        },
        title: {
          text: "Linked statistics for Commits"
        },
        subtitle: {
          text: "Total commits: " + parsed.total
        }
      };

      resolve( chartData );
    } ) ;
  } );

  return linkedCommitsPromise;
};

function getLinkedBugs( globalSettings ) {
  var linkedBugsPromise = new Promise( function( resolve, reject ) {
    var project;
    var dict;
    var dictId;

    if( globalSettings.project && globalSettings.project.id ) {
      project = globalSettings.project.id;
      dict = globalSettings.project.dictionary;

      if( dict ) {
        if( dict.context && dict.context != "bug" && dict.context != "all" ) {
          resolve( null );
        }

        dictId = globalSettings.project.dictionary.id || "-1";
        dictId = dictId < 0 ? null : dictId;
      }
    } else {
      resolve( null );
    }

    db.all( queries.SELECT_LINKED_BUGS, [ project, project, project ], function( err, lc ) {
      if( err ) {
        console.log( err );
        reject( err );
      }

      var parsed = parseForPieChart( lc );

      var chartData = {
        series: {
          name: "Linked",
          data: parsed.data
        },
        title: {
          text: "Linked statistics for Bugs"
        },
        subtitle: {
          text: "Total bugs: " + parsed.total
        }
      };

      resolve( chartData );
    } ) ;
  } );

  return linkedBugsPromise;
};

function parseOverviewData( cats ) {
  var data = [ ];
  var totalAmount = 0;

  _.forEach( cats, function( cat, i ) {
    if( cat.amount > 0 ) {
      totalAmount += cat.amount;

      var c = {
        name: cat.category + " (" + cat.amount + ")",
        y: cat.amount
      };

      data.push( c );
    }
  } );

  // calculate the percentage
  _.forEach( data, function( cat, i ) {
    cat.y = cat.y / totalAmount;
  } );

  return { data: data, total: totalAmount };
};

function parseForPieChart( cats ) {
  var series = { };
  var data = [ ];
  var totalAmount = 0;

  _.forEach( cats, function( cat, i ) {
    if( cat.amount > 0 ) {
      if( series[ cat.category ] ) {
        series[ cat.category ].y += cat.amount;
      } else {
        series[ cat.category ] = {
          y: cat.amount
        };
      }

      totalAmount += cat.amount;
    }
  } );

  _.forEach( series, (obj,key) => {
    obj.name = key + " (" + obj.y + ")";
    obj.y = obj.y / totalAmount;

    data.push( obj );
  } );

  return { data: data, total: totalAmount };
};

module.exports = router;
