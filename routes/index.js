var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var fs = require('fs');
var hbs = require('hbs');

var config = require('../config/config');

// load the modern build
var _ = require('lodash');

var db = require( '../db/db' );

// require all routes (controllers)
var userProfiles = require('./userprofiles');
var sentiments = require('./sentiments');
var processMetrics = require('./processmetrics');
var productMetrics = require('./productmetrics');

// use the required routes
router.use( '/userprofiles', userProfiles );
router.use( '/sentiments', sentiments );
router.use( '/processmetrics', processMetrics );
router.use( '/productmetrics', productMetrics );
router.use( '/settings', require('./settings') );

var stmts = {
  allProjects: "SELECT id, product FROM Projects",

  commitCats: "SELECT "
    + "   Categories.name as label, COUNT(*) as amount "
    + "FROM "
    + "   Commits, CommitCategories, Categories, Dictionary "
    + "WHERE "
    + "   Commits.id=CommitCategories.commitId "
    + "   AND Commits.project = ?"
    + "   AND CommitCategories.category=Categories.id "
    + "   AND Categories.dictionary=Dictionary.id "
    + "   AND Dictionary.project = ? "
    + "   AND Categories.dictionary = ? "
    + "GROUP BY "
    + "   CommitCategories.category"
    + " UNION "
    + "SELECT "
    + "   'uncategorised', (SELECT COUNT(*) "
    + "FROM "
    + "   Commits "
    + "WHERE "
    + "   Commits.project = ?)"
    + " - (SELECT COUNT(*) FROM Commits, CommitCategories WHERE Commits.id = CommitCategories.commitId AND Commits.project = ?)",

  bugCats: "SELECT "
    + "   Categories.name as label, COUNT(*) as amount "
    + "FROM "
    + "   BugCategories, Categories, Dictionary, Components, Bugs "
    + "WHERE "
    + "   Bugs.id = BugCategories.bug "
    + "   AND Bugs.component = Components.id "
    + "   AND Components.project = ? "
    + "   AND BugCategories.category=Categories.id "
    + "   AND Categories.dictionary=Dictionary.id "
    + "   AND Dictionary.project = ? "
    // + "   AND Categories.dictionary= ? "
    + "GROUP BY BugCategories.category "
    + "UNION SELECT 'uncategorised', (SELECT COUNT(*) FROM Bugs, Components WHERE Bugs.component = Components.id AND Components.project = ?)"
    + " - (SELECT COUNT(*) FROM Bugs, Components, BugCategories WHERE Bugs.component=Components.id AND Components.project = ? AND BugCategories.bug = Bugs.id)",

  linkedCommits: "SELECT "
    + "  'Linked' as label,"
    + "   (SELECT COUNT(*) FROM BugfixCommit, Commits WHERE BugfixCommit.commitId=Commits.id AND Commits.project = ?) amount "
    + "UNION "
    + "   SELECT 'Unlinked',"
    + "     (SELECT COUNT(*) FROM Commits WHERE project = ?)"
    + "     - "
    + "     (SELECT COUNT(*) FROM BugfixCommit, Commits WHERE BugfixCommit.commitId = Commits.id AND Commits.project = ?)",

  linkedBugs: "SELECT "
    + "   'Linked' as label,"
    + "   (SELECT COUNT(*) FROM BugfixCommit, Bugs, Components WHERE BugfixCommit.bug=Bugs.id AND Bugs.component=Components.id AND Components.project = ?) as amount "
    + "UNION "
    + "   SELECT 'Unlinked',"
    + "     (SELECT COUNT(*) FROM Bugs, Components WHERE Bugs.component=Components.id AND Components.project = ?)"
    + "     - "
    + "     (SELECT COUNT(*) FROM BugfixCommit, Bugs, Components WHERE BugfixCommit.bug = Bugs.id AND Bugs.component=Components.id AND Components.project = ?)"
};

var project = "1";
var commitDict = "1";

router.get('/', function(req, res, next) {
  db.serialize( function( ) {
    db.all( stmts.allProjects, [ ], function( err, projects ) {
      if( err ) {
        console.log( err );
        console.log( "ERROR" );
      }

      config.UI.set( "projects", projects );

      var data = {
        title: "Overview",
        ovactive: "active"
      };

      config.UI.load( ).then( function( uiConf ) {
        _.extend( data, uiConf );

        res.render( 'index', data );
      } );
    } );
  } );

});

/* POST project id to get all projects. */
router.post('/:id', function(req, res, next) {
  project = parseInt( req.body.id, 10 );

  if( project < 0 ) {
    config.UI.remove( "project" );
    res.status( 404 ).send( { message: "No Project for given id " + project } );
  } else {
    config.UI.set( "project.id", project ).then( function( settings ) {

      var commitCats = { };
      var bugCats = { };
      var linkedCommits = { };
      var linkedBugs = { };

      db.serialize( function( ) {
        getCommitCats( project ).then( function( cc ) {
          commitCats = cc;

          getBugCats( project ).then( function( bc ) {
            bugCats = bc;

            getLinkedCommits( project ).then( function( lc ) {
              linkedCommits = lc;

              getLinkedBugs( project ).then( function( lb ) {
                linkedBugs = lb;

                var data = {
                  commitCats: commitCats,
                  bugCats: bugCats,
                  linkedCommits: linkedCommits,
                  linkedBugs: linkedBugs
                };

                _.extend( data, config.UI );

                res.send( data );

              } );  // getLinkedBugs

            } );  // getLinkedCommits

          } );  // getBugCats

        } );  // getCommitCats

      } );
    } );
  }

});

function getCommitCats( project ) {
  var commitCatsPromise = new Promise( function( resolve, reject ) {
    db.all( stmts.commitCats, [ project, project, commitDict, project, project ], function( err, cats ) {
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

      var parsedCats = parseOverviewData( cats );

      var chartData = {
        series: {
          name: "Category",
          data: parsedCats.data
        },
        title: {
          text: "Commit Categories (" + parsedCats.total + ")"
        }
      };

      resolve( chartData );
    } ) ;
  } );

  return commitCatsPromise;
};

function getBugCats( project ) {
  var bugCatsPromise = new Promise( function( resolve, reject ) {
    db.all( stmts.bugCats, [ project, project, project, project ], function( err, cats ) {
      if( err ) {
        console.log( err );
        reject( err );
      }

      var parsedCats = parseOverviewData( cats );

      var chartData = {
        series: {
          name: "Category",
          data: parsedCats.data
        },
        title: {
          text: "Bug Categories (" + parsedCats.total + ")"
        }
      };

      resolve( chartData );
    } ) ;
  } );

  return bugCatsPromise;
};

function getLinkedCommits( project ) {
  var linkedCommitsPromise = new Promise( function( resolve, reject ) {
    db.all( stmts.linkedCommits, [ project, project, project ], function( err, lc ) {
      if( err ) {
        console.log( err );
        reject( err );
      }

      var parsed = parseOverviewData( lc );

      var chartData = {
        series: {
          name: "Linked",
          data: parsed.data
        },
        title: {
          text: "Linked Commits (" + parsed.total + ")"
        }
      };

      resolve( chartData );
    } ) ;
  } );

  return linkedCommitsPromise;
};

function getLinkedBugs( project ) {
  var linkedBugsPromise = new Promise( function( resolve, reject ) {
    db.all( stmts.linkedBugs, [ project, project, project ], function( err, lc ) {
      if( err ) {
        console.log( err );
        reject( err );
      }

      var parsed = parseOverviewData( lc );

      var chartData = {
        series: {
          name: "Linked",
          data: parsed.data
        },
        title: {
          text: "Linked Commits (" + parsed.total + ")"
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
    totalAmount += cat.amount;

    var c = {
      name: cat.label + " (" + cat.amount + ")",
      y: cat.amount
    };

    data.push( c );
  } );

  // calculate the percentage
  _.forEach( data, function( cat, i ) {
    cat.y = cat.y / totalAmount;
  } );

  return { data: data, total: totalAmount };
};

module.exports = router;
