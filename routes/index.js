var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var fs = require('fs');
var hbs = require('hbs');

var config = require('../config/config');

// load the modern build
var _ = require('lodash');

var db = require( '../db/db' );
var queries = require( '../db/queries' );

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
          ovactive: "active"
        };

        _.extend( data, settings );

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
    config.UI.set( { "project.id": project } ).then( function( settings ) {

      var commitCats = { };
      var bugCats = { };
      var linkedCommits = { };
      var linkedBugs = { };

      db.serialize( function( ) {
        getCommitCats( project, settings ).then( function( cc ) {
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

                _.extend( data, settings );

                res.send( data );

              } );  // getLinkedBugs

            } );  // getLinkedCommits

          } );  // getBugCats

        } );  // getCommitCats

      } );
    } );
  }

});

function getCommitCats( project, settings ) {
  var commitCatsPromise = new Promise( function( resolve, reject ) {
    var commitDict = "";
    var committer = "";
    var query = "";
    var params = [ ];

    if( settings.project && settings.project.dictionary ) {
      commitDict = settings.project.dictionary.id || "";
      commitDict = commitDict < 0 ? null : commitDict;
    }

    if( settings.project && settings.project.user ) {
      committer = settings.project.user.id || "";
      committer = committer < 0 ? null : committer;
    }

    if( commitDict == null || committer == null ) {
      params = [ project, project, project, project ];
      query = queries.SELECT_ALL_COMMIT_CATEGORIES;
    } else {
      params = [ project, project, commitDict, committer, project, project ];
      query = queries.SELECT_COMMIT_CATEGORIES_BY_DICT_AND_COMMITTER;
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

      var parsedCats = parseOverviewData( cats );

      var chartData = {
        series: {
          name: "Category",
          data: parsedCats.data
        },
        title: {
          text: "Commits by Categories (" + parsedCats.total + ")"
        }
      };

      resolve( chartData );
    } ) ;
  } );

  return commitCatsPromise;
};

function getBugCats( project ) {
  var bugCatsPromise = new Promise( function( resolve, reject ) {
    db.all( queries.SELECT_BUG_CATEGORIES, [ project, project, project, project ], function( err, cats ) {
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
          text: "Bugs by Categories (" + parsedCats.total + ")"
        }
      };

      resolve( chartData );
    } ) ;
  } );

  return bugCatsPromise;
};

function getLinkedCommits( project ) {
  var linkedCommitsPromise = new Promise( function( resolve, reject ) {
    db.all( queries.SELECT_LINKED_COMMITS, [ project, project, project ], function( err, lc ) {
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
          text: "Linked statistics for Commits (" + parsed.total + ")"
        }
      };

      resolve( chartData );
    } ) ;
  } );

  return linkedCommitsPromise;
};

function getLinkedBugs( project ) {
  var linkedBugsPromise = new Promise( function( resolve, reject ) {
    db.all( queries.SELECT_LINKED_BUGS, [ project, project, project ], function( err, lc ) {
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
          text: "Linked statistics for Bugs (" + parsed.total + ")"
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
