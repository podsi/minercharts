var config = require('../../config/config');
var hbs = require('hbs');
var Util = require('../../helpers/util');
var Promise = require('bluebird');

// load the modern build
var _ = require('lodash');

var db = require( '../../db/db' );
var queries = require( '../../db/queries' );

var Bug = {

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

      if( cat.amount > 0 ) {
        total += cat.amount;

        point = {
          x: Date.parse( cat.creation ),// to show just the month and not the exactly date, use: Date.UTC( year, cat.month - 1),
          y: cat.amount
        };

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

    return { series: data , total: total, catsToSeries: series };
  },

  parseForPieChart( cats ) {
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
  },

  calcBoxPlotData( parsedData ) {
    console.log( "=======parsedData================" );
    console.log( parsedData.series[ 0 ] );
    console.log( "=================================" );
    var numberOfBoxes = 1;
    var boxPlotData = {
      boxData: [ ],
      meanData: [ ]
    };

    var boxData  = [ ];
    var meanData = [ ];

    for(var i = 0; i < numberOfBoxes; i++) {
      var data = [ ];
      var boxValues  = Bug.getBoxValues( data );

      boxPlotData.boxData.push( boxValues );
      boxPlotData.meanData.push( Bug.mean( data ) );
    }

    return boxPlotData;
  },

  getBoxValues( data ) {
    var boxValues = { };

    boxValues.low = Math.min.apply( Math, data );
    boxValues.q1 = Bug.getPercentile( data, 25 );
    boxValues.median = Bug.getPercentile( data, 50 );
    boxValues.q3 = Bug.getPercentile( data, 75 );
    boxValues.high = Math.max.apply( Math, data );

    return boxValues;
  },

  getPercentile( data, percentile ) {
    data.sort( );

    var index = ( percentile / 100 ) * data.length;
    var result;

    if( Math.floor( index ) == index ) {
      result = ( data[ ( index - 1 ) ] + data[ index ] ) / 2;
    }
    else {
      result = data[ Math.floor( index ) ];
    }

    return result;
  },

  mean( data ) {
    var len = data.length;
    var sum = 0;

    for(var i = 0; i < len; i++) {
      sum += parseFloat( data[ i ] );
    }

    return (sum / len);
  },

  getBugcatsPerAuthor( currentSettings, chartType ) {
    var bugcatsPerAuthorPromise = new Promise( function( resolve, reject ) {
      var query = "";
      var params = [ ];

      if( currentSettings && currentSettings.project && currentSettings.project.id ) {
        if( currentSettings.dict == null ) {
          reject( "Please select a 'bug' dictionary!" );
        } else if( currentSettings.uid == null ) {
          reject( "Please select a user!" );
        } else {
          params = [ currentSettings.pid, currentSettings.dict ];

          if( currentSettings.year !== "all" ) {
            if( currentSettings.uid < 0 ) {
              query = queries.SELECT_BUG_CATEGORIES_BY_PROJECT_AND_DICT_AND_YEAR;
              params.push( currentSettings.year );
            } else {
              query = queries.SELECT_BUG_CATEGORIES_BY_PROJECT_AND_DICT_AND_IDENTITY_AND_YEAR;
              params.push( currentSettings.uid );
              params.push( currentSettings.year );
            }
          } else {
            if( currentSettings.uid < 0 ) {
              // query = queries.SELECT_BUG_CATEGORIES_BY_PROJECT_AND_DICT;
              // params.unshift( currentSettings.pid );
              // params.push( currentSettings.pid );
              // params.push( currentSettings.pid );
              // params.push( currentSettings.pid );
              // params.push( currentSettings.dict );
              query = queries.SELECT_BUG_CATEGORIES_BY_PROJECT_AND_DICT_2;
            } else {
              query = queries.SELECT_BUG_CATEGORIES_BY_PROJECT_AND_DICT_AND_IDENTITY;
              params.push( currentSettings.uid );
            }
          }

          db.all( query, params, function( err, cats ) {
            if( err ) {
              console.log( err );
              reject( err );
            }

            if( cats.length > 0 ) {
              var parsedData;
              var chartData = {
                title: {
                  text: "Bugs per user"
                }
              };

              if( chartType && chartType == 1 ) {
                parsedData = Bug.parseForPieChart( cats );

                chartData.series = {
                  name: "Bugs",
                  data: parsedData.data
                };

              } else {
                parsedData = Bug.parseBugcatsData( cats, currentSettings.year );

                chartData.series = parsedData.series;
                chartData.yAxis = {
                  title: {
                    text: "Bugs"
                  }
                };
              }

              chartData.subtitle = {
                text: currentSettings.year + " total: " + parsedData.total
              };

              // var parsedData = Bug.parseBugcatsData( cats, currentSettings.year );

              // var chartData = {
              //   series: parsedData.series,
              //   title: {
              //     text: "Bug category per author"
              //   },
              //   subtitle: {
              //     text: currentSettings.year + " total: " + parsedData.total
              //   },
              //   yAxis: {
              //     title: {
              //       text: "Bugs"
              //     }
              //   }
              // };

              resolve( chartData );
            } else {
              reject( "Couldn't find any bugs for user '" + currentSettings.uname
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

  // getQueryAndParams( tab ) {
  //   switch( tab )
  // },

  getBugStatusPerUser( currentSettings ) {
    var bugStatusPerUserPromise = new Promise( function( resolve, reject ) {
      var query = "";
      var params = [ ];

      if( currentSettings && currentSettings.project && currentSettings.project.id ) {
        if( currentSettings.dict == null ) {
          reject( "Please select a 'bug' dictionary!" );
        } else if( currentSettings.uid == null ) {
          reject( "Please select a user!" );
        } else {
          query = "SELECT "
            + " Categories.name as category, COUNT(Bugs.id) as amount, Bugs.creation, Bugs.isOpen, "
            + " CAST(strftime('%m', Bugs.creation) AS INTEGER) as month "
            + "FROM "
            + " Categories, Bugs, BugCategories, Components "
            + "WHERE "
            + " Bugs.id = BugCategories.bug "
            + " AND Components.id = Bugs.component "
            + " AND Components.project = ?   "
            + " AND Categories.id = BugCategories.category "
            + " AND Categories.dictionary = ? ";
          params = [ currentSettings.pid, currentSettings.dict ];

          if( currentSettings.year !== "all" ) {
            if( currentSettings.uid < 0 ) {
              query += " AND CAST(strftime('%Y', Bugs.creation) AS INTEGER) = ? ";
              params.push( currentSettings.year );
            } else {
              query += " AND CAST(strftime('%Y', Bugs.creation) AS INTEGER) = ? "
                + " AND Bugs.identity = ? ";
              params.push( currentSettings.year );
              params.push( currentSettings.uid );
            }
          } else {
            if( currentSettings.uid > 0 ) {
              query += " AND Bugs.identity = ? ";
              params.push( currentSettings.uid );
            } else {
              // default query
            }
          }

          if( currentSettings.pmSettings.openclosed &&
            currentSettings.pmSettings.openclosed !== "both" ) {

            query += " AND Bugs.isOpen = ? ";
            params.push( currentSettings.pmSettings.openclosed );
          }

          query += " GROUP BY strftime('%m', Bugs.creation), Categories.name ";

          db.all( query, params, function( err, cats ) {
            if( err ) {
              console.log( err );
              reject( err );
            }

            if( cats.length > 0 ) {
              var parsedData = Bug.parseBugcatsData( cats, currentSettings.year );

              var chartData = {
                series: parsedData.series,
                title: {
                  text: "Open/Closed Bugs per category"
                },
                subtitle: {
                  text: currentSettings.year + " total: " + parsedData.total
                },
                yAxis: {
                  title: {
                    text: "Bugs"
                  }
                }
              };

              resolve( chartData );
            } else {
              reject( "Couldn't find any bugs for user '" + currentSettings.uname
                + "'. Try to change the filters (project, dictionary, year)!" );
            }
          } ) ;
        }
      } else {
        reject( "Please select a project!" );
      }
    } );

    return bugStatusPerUserPromise;
  },

  getCommentsPerUser( currentSettings ) {
    var commentsPerUserPromise = new Promise( function( resolve, reject ) {
      var query = "";
      var params = [ ];

      if( currentSettings && currentSettings.project && currentSettings.project.id ) {
        if( currentSettings.dict == null ) {
          reject( "Please select a 'bug' dictionary!" );
        } else if( currentSettings.uid == null ) {
          reject( "Please select a user!" );
        } else {
          query = "SELECT "
            + " Categories.name as category, COUNT(Comments.id) as amount, Comments.creation, "
            + " CAST(strftime('%m', Comments.creation) AS INTEGER) as month "
            + "FROM "
            + " Categories, Bugs, BugCategories, Components, Comments "
            + "WHERE "
            + " Bugs.id = BugCategories.bug "
            + " AND Comments.bug = Bugs.id "
            + " AND Components.id = Bugs.component "
            + " AND Components.project = ?   "
            + " AND Categories.id = BugCategories.category "
            + " AND Categories.dictionary = ? ";
          params = [ currentSettings.pid, currentSettings.dict ];

          if( currentSettings.year !== "all" ) {
            if( currentSettings.uid < 0 ) {
              query += " AND CAST(strftime('%Y', Comments.creation) AS INTEGER) = ? ";
              params.push( currentSettings.year );
            } else {
              query += " AND CAST(strftime('%Y', Comments.creation) AS INTEGER) = ? "
                + " AND Bugs.identity = ? ";
              params.push( currentSettings.year );
              params.push( currentSettings.uid );
            }
          } else {
            if( currentSettings.uid > 0 ) {
              query += " AND Bugs.identity = ? ";
              params.push( currentSettings.uid );
            } else {
              // default query
            }
          }

          if( currentSettings.pmSettings.openclosed &&
            currentSettings.pmSettings.openclosed !== "both" ) {

            query += " AND Bugs.isOpen = ? ";
            params.push( currentSettings.pmSettings.openclosed );
          }

          query += " GROUP BY strftime('%m', Comments.creation), Categories.name ";

          db.all( query, params, function( err, cats ) {
            if( err ) {
              console.log( err );
              reject( err );
            }

            if( cats.length > 0 ) {
              var parsedData = Bug.parseBugcatsData( cats, currentSettings.year );

              var boxPlotData = Bug.calcBoxPlotData( parsedData );
              console.log( boxPlotData );

              var chartData = {
                series: parsedData.series,
                title: {
                  text: "Comments"
                },
                subtitle: {
                  text: currentSettings.year + " total: " + parsedData.total
                },
                yAxis: {
                  title: {
                    text: "Comments"
                  }
                }
              };

              resolve( chartData );
            } else {
              reject( "Couldn't find any bugs for user '" + currentSettings.uname
                + "'. Try to change the filters (project, dictionary, year)!" );
            }
          } ) ;
        }
      } else {
        reject( "Please select a project!" );
      }
    } );

    return commentsPerUserPromise;
  },

  getPatchesPerUser( currentSettings ) {
    var patchesPerUserPromise = new Promise( function( resolve, reject ) {
      var query = "";
      var params = [ ];

      if( currentSettings && currentSettings.project && currentSettings.project.id ) {
        if( currentSettings.dict == null ) {
          reject( "Please select a 'bug' dictionary!" );
        } else if( currentSettings.uid == null ) {
          reject( "Please select a user!" );
        } else {
          query = "SELECT "
            + " Categories.name as category, COUNT(atts.id) as amount, attDet.attCreationTime as creation, "
            + " CAST(strftime('%m', attDet.attCreationTime) AS INTEGER) as month "
            + "FROM "
            + " Categories, Bugs, BugCategories, Components, Comments, Attachments atts, AttachmentDetails attDet "
            + "WHERE "
            + " Bugs.id = BugCategories.bug "
            + " AND Comments.bug = Bugs.id "
            + " AND Comments.id = atts.comment "
            + " AND attDet.attachment = atts.id "
            + " AND attDet.isPatch = 1 "
            + " AND Components.id = Bugs.component "
            + " AND Components.project = ?   "
            + " AND Categories.id = BugCategories.category "
            + " AND Categories.dictionary = ? ";
          params = [ currentSettings.pid, currentSettings.dict ];

          if( currentSettings.year !== "all" ) {
            if( currentSettings.uid < 0 ) {
              query += " AND CAST(strftime('%Y', attDet.attCreationTime) AS INTEGER) = ? ";
              params.push( currentSettings.year );
            } else {
              query += " AND CAST(strftime('%Y', attDet.attCreationTime) AS INTEGER) = ? "
                + " AND Bugs.identity = ? ";
              params.push( currentSettings.year );
              params.push( currentSettings.uid );
            }
          } else {
            if( currentSettings.uid > 0 ) {
              query += " AND Bugs.identity = ? ";
              params.push( currentSettings.uid );
            } else {
              // default query
            }
          }

          query += " GROUP BY strftime('%m', attDet.attCreationTime), Categories.name ";

          db.all( query, params, function( err, cats ) {
            if( err ) {
              console.log( err );
              reject( err );
            }

            if( cats.length > 0 ) {
              var parsedData = Bug.parseBugcatsData( cats, currentSettings.year );

              var chartData = {
                series: parsedData.series,
                title: {
                  text: "Patches"
                },
                subtitle: {
                  text: currentSettings.year + " total: " + parsedData.total
                },
                yAxis: {
                  title: {
                    text: "Patches"
                  }
                }
              };

              resolve( chartData );
            } else {
              reject( "Couldn't find any bugs for user '" + currentSettings.uname
                + "'. Try to change the filters (project, dictionary, year)!" );
            }
          } ) ;
        }
      } else {
        reject( "Please select a project!" );
      }
    } );

    return patchesPerUserPromise;
  }

};

module.exports = Bug;