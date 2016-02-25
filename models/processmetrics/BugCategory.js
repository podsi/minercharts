var config = require('../../config/config');
var hbs = require('hbs');
var Util = require('../../helpers/util');
var Promise = require('bluebird');

// load the modern build
var _ = require('lodash');

var db = require( '../../db/db' );
var queries = require( '../../db/queries' );

var BugCategory = {

  getBugcatsPerAuthor( globalSettings, pmSettings ) {
    var bugcatsPerAuthorPromise = new Promise( function( resolve, reject ) {
      var commitDict = null;
      var userId = pmSettings.bcatsauthor.user.id;
      var uname = pmSettings.bcatsauthor.user.name;
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
          params = [ pid, commitDict ];

          if( year !== "all" ) {
            if( userId < 0 ) {
              query = queries.SELECT_BUG_CATEGORIES_BY_PROJECT_AND_DICT_AND_YEAR;
              params.push( year );
            } else {
              query = queries.SELECT_BUG_CATEGORIES_BY_PROJECT_AND_DICT_AND_IDENTITY_AND_YEAR;
              params.push( userId );
              params.push( year );
            }
          } else {
            if( userId < 0 ) {
              query = queries.SELECT_BUG_CATEGORIES_BY_PROJECT_AND_DICT;
              params.unshift( pid );
              params.push( pid );
              params.push( pid );
              params.push( pid );
              params.push( commitDict );
            } else {
              query = queries.SELECT_BUG_CATEGORIES_BY_PROJECT_AND_DICT_AND_IDENTITY;
              params.push( userId );
            }
          }

          db.all( query, params, function( err, cats ) {
            if( err ) {
              console.log( err );
              reject( err );
            }

            if( cats.length > 0 ) {
              var parsedData = BugCategory.parseBugcatsData( cats, year );

              var chartData = {
                series: parsedData.series,
                title: {
                  text: "Bug-Category per author"
                },
                subtitle: {
                  text: year + " total: " + parsedData.total
                },
                yAxis: {
                  title: {
                    text: "Bugs"
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

    return bugcatsPerAuthorPromise;
  },

  parseBugcatsData( cats, year ) {
    var series = { };
    var monthTotal = { };
    var total = 0;
    var data = [ ];

    _.forEach( cats, function( cat, i ) {
      if( !monthTotal[ cat.month - 1 ] ) {
        monthTotal[ cat.month - 1 ] = cat.amount;
      } else {
        monthTotal[ cat.month - 1 ] += cat.amount;
      }

      total += cat.amount;

      point = {
        x: Date.parse( cat.creation ),// to show just the month and not the exactly date, use: Date.UTC( year, cat.month - 1),
        y: cat.amount
      };

      if( point.y > 0 ) {
        if( !series[ cat.category ] ) {
          series[ cat.category ] = {
            data: [ point ],
            amount: cat.amount
          };
        } else {
          series[ cat.category ].data.push( point );
          series[ cat.category ].amount += cat.amount;
        }
      }
    } );

    // series[ "total" ] = {
    //   data: [ ],
    //   amount: 0
    // };

    _.forEach( monthTotal, (val,key) => {
      point = {
        x: Date.UTC( year, key ),
        y: val
      };

      // series[ "total" ].data.push( point );
      // series[ "total" ].amount += val;
    });

    _.forEach( series, (obj,key) => {
      obj.name = key + " (" + obj.amount + ")";
      obj.data = _.sortByOrder( obj.data, [ "x" ], [ "asc" ] );
      data.push( obj );
    } );

    return { series: data , total: total };
  }

};

module.exports = BugCategory;