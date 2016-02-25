var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var config = require('../../config/config');
var hbs = require('hbs');
var Util = require('../../helpers/util');
var Promise = require('bluebird');

// load the modern build
var _ = require('lodash');

var db = require( '../../db/db' );
var queries = require( '../../db/queries' );

/* GET users listing. */
router.get('/', function(req, res, next) {
  var data = {
    title: 'Product metrics',
    subtitle: 'Charts for the product metrics',
    prodmactive: "active",
    comuser: "active"
  };

  config.UI.load( ).then( function( uiConf ) {
    _.extend( data, uiConf );

    res.render('productmetrics', data );
  } );
});

/*
  Commits per user
 */
router.post( '/per_user', function( req, res, next ) {
  // see middleware in routes/index.js
  var uiSettings = req.body.uiSettings;
  var pmSettings = req.body.pmSettings;

  getCommitsPerUser( uiSettings.globalSettings, pmSettings ).then( cats => {
    res.status( 200 ).send(
      {
        success: true,
        partials: uiSettings.partials,
        globalSettings: uiSettings.globalSettings,
        comuser: cats
      }
    );

  }, reason => {
    var html = Util.getPartialByName( "info", { message: reason } );

    res.status( 200 ).send( {
      success: false,
      message: html
    } );
  } );

} );


/**
 * Runs the DB-Query and parses the result set.
 * @param  {Object} globalSettings      The global UI globalSettings.
 * @param  {Object} pmSettings    The specific UI globalSettings for product metrics.
 * @return {Promise} A Promise instance.
 */
function getCommitsPerUser( globalSettings, pmSettings ) {
  var commitsPerUserPromise = new Promise( function( resolve, reject ) {
    var commitDict = null;
    var userId = pmSettings.comuser.user.id;
    var uname = pmSettings.comuser.user.name;
    var query = "";
    var params = [ ];
    var pid = null;
    var year = "all";

    if( globalSettings.project && globalSettings.project.id ) {
      pid = globalSettings.project.id;

      if( globalSettings.project.dictionary ) {
        commitDict = globalSettings.project.dictionary.id || "-1";
        commitDict = commitDict < 0 ? null : commitDict;
      }

      if( globalSettings.project.year ) {
        year = globalSettings.project.year || "all";
        year = year < 0 ? null : year;
      }

      if( globalSettings.project.user ) {
        userId = globalSettings.project.user.id || "-1";
        userId = userId < 0 ? null : userId;

        uname = globalSettings.project.user.name || "";
      }

      if( commitDict == null ) {
        reject( "Please select a dictionary!" );
      } else if( userId == null ) {
        reject( "Please select a user!" );
      } else {

        if( year !== "all" ) {
          if( userId < 0 ) {
            query = queries.SELECT_COMMIT_CATEGORIES_BY_PROJECT_AND_DICT_AND_YEAR;
            params = { $dict: commitDict, $project: pid, $year: year };
          } else {
            query = queries.SELECT_COMMIT_CATEGORIES_BY_PROJECT_AND_DICT_AND_YEAR_AND_AUTHOR;
            params = { $author: userId, $dict: commitDict, $project: pid, $year: year };
          }
        } else {
          if( userId < 0 ) {
            query = queries.SELECT_COMMIT_CATEGORIES_BY_PROJECT_AND_DICT;
            params = { $project: pid, $dict: commitDict };
          } else {
            query = queries.SELECT_COMMIT_CATEGORIES_BY_PROJECT_AND_DICT_AND_AUTHOR;
            params = { $author: userId, $dict: commitDict, $project: pid };
          }
        }

        db.all( query, params, function( err, cats ) {
          if( err ) {
            console.log( err );
            reject( err );
          }

          if( cats.length > 0 ) {
            var parsedData = parseCommitCatsData( cats, year );

            var chartData = {
              series: parsedData.series,
              title: {
                text: "Commits per user"
              },
              subtitle: {
                text: year + " total: " + parsedData.total
              },
              yAxis: {
                title: {
                  text: "Commits"
                }
              }
            };

            resolve( chartData );
          } else {
            reject( "Couldn't find any bugs for user '" + uname
              + "'. Try to change the filters (project, dictionary, year)!" );
          }
        } ) ;
      }
    } else {
      reject( "Please select a project!" );
    }
  } );

  return commitsPerUserPromise;
};

/**
 * Parsing the data returned by the DB-Query (result set).
 * @param  {Array} cats          The categories for each commit grouped by.
 * @param  {String} year          The year which is used for the total dataset.
 * @return {Object} An object with keys "series" & "total".
 */
function parseCommitCatsData( cats, year ) {
  var series = { };
  var monthTotal = { };
  var total = 0;
  var data = [ ];
  var point;

  _.forEach( cats, function( cat, i ) {
    if( !monthTotal[ cat.month - 1 ] ) {
      monthTotal[ cat.month - 1 ] = cat.amount;
    } else {
      monthTotal[ cat.month - 1 ] += cat.amount;
    }

    total += cat.amount;

    point = {
      x: Date.parse( cat.date ),// to show just the month and not the exactly date, use: Date.UTC( year, cat.month - 1),
      y: cat.amount
    };

    if( !series[ cat.label ] ) {
      series[ cat.label ] = {
        data: [ point ],
        amount: cat.amount
      };
    } else {
      series[ cat.label ].data.push( point );
      series[ cat.label ].amount += cat.amount;
    }
  } );

  // this would draw a total curve
  // series[ "total" ] = {
  //   data: [ ],
  //   amount: 0
  // };

  // _.forEach( monthTotal, (val,key) => {
  //   point = {
  //     x: Date.UTC( year, key ),
  //     y: val
  //   };

  //   series[ "total" ].data.push( point );
  //   series[ "total" ].amount += val;
  // });

  _.forEach( series, (obj,key) => {
    obj.name = key + " (" + obj.amount + ")";
    obj.data = _.sortByOrder( obj.data, [ "x" ], [ "asc" ] );
    data.push( obj );
  } );

  return { series: data, total: total };
};

module.exports = router;
