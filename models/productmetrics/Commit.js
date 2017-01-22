var config = require('../../config/config');
var hbs = require('hbs');
var Util = require('../../helpers/util');
var Promise = require('bluebird');

// load the modern build
var _ = require('lodash');

var db = require( '../../db/db' );
var queries = require( '../../db/queries' );


Commit = {
  /**
   * Parsing the data returned by the DB-Query (result set).
   * @param  {Array} cats          The categories for each commit grouped by.
   * @param  {String} year          The year which is used for the total dataset.
   * @return {Object} An object with keys "series" & "total".
   */
  parseCommitCatsData( cats, year ) {
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

      if( !series[ cat.category ] ) {
        series[ cat.category ] = {
          data: [ point ],
          amount: cat.amount
        };
      } else {
        series[ cat.category ].data.push( point );
        series[ cat.category ].amount += cat.amount;
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

  parseForBoxPlot( records, attribute ) {

  },

  calcBoxPlotData( parsedData ) {
    var numberOfBoxes = 1;
    var boxPlotData = {
      boxData: [ ],
      meanData: [ ]
    };

    var boxData  = [ ];
    var meanData = [ ];

    for(var i = 0; i < numberOfBoxes; i++) {
      var data = [ ];
      var boxValues  = Commit.getBoxValues( data );

      boxPlotData.boxData.push( boxValues );
      boxPlotData.meanData.push( Commit.mean( data ) );
    }

    return boxPlotData;
  },

  getBoxValues( data ) {
    var boxValues = { };

    boxValues.low = Math.min.apply( Math, data );
    boxValues.q1 = Commit.getPercentile( data, 25 );
    boxValues.median = Commit.getPercentile( data, 50 );
    boxValues.q3 = Commit.getPercentile( data, 75 );
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

  /**
   * Runs the DB-Query and parses the result set.
   * @param  {Object} currentSettings      The global UI globalSettings and
   *                                       the specific UI globalSettings for product metrics.
   * @return {Promise} A Promise instance.
   */
  getCommitsPerUser( currentSettings, chartType ) {
    var commitsPerUserPromise = new Promise( function( resolve, reject ) {
      var query = "";
      var params = {
        $project: currentSettings.pid,
        $dict: currentSettings.dict
      };

      if( currentSettings && currentSettings.project && currentSettings.project.id ) {
        if( currentSettings.dict == null ) {
          reject( "Please select a 'src' dictionary!" );
        } else if( currentSettings.uid == null ) {
          reject( "Please select a user!" );
        } else {
          if( currentSettings.year !== "all" ) {
            if( currentSettings.uid < 0 ) {
              query = queries.SELECT_COMMIT_CATEGORIES_BY_PROJECT_AND_DICT_AND_YEAR;
              params[ '$year' ] = currentSettings.year;
            } else {
              query = queries.SELECT_COMMIT_CATEGORIES_BY_PROJECT_AND_DICT_AND_YEAR_AND_AUTHOR;
              params[ '$author' ] = currentSettings.uid;
              params[ '$year' ] = currentSettings.year;
            }
          } else {
            if( currentSettings.uid < 0 ) {
              query = queries.SELECT_COMMIT_CATEGORIES_BY_PROJECT_AND_DICT;
            } else {
              query = queries.SELECT_COMMIT_CATEGORIES_BY_PROJECT_AND_DICT_AND_AUTHOR;
              params[ '$author' ] = currentSettings.uid;
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
                  text: "Commits per user"
                }
              };

              if( chartType && chartType == 1 ) {
                parsedData = Commit.parseForPieChart( cats );

                chartData.series = {
                  name: "Commits",
                  data: parsedData.data
                };

              } else {
                parsedData = Commit.parseCommitCatsData( cats, currentSettings.year );

                chartData.series = parsedData.series;
                chartData.yAxis = {
                  title: {
                    text: "Commits"
                  }
                };
              }

              chartData.subtitle = {
                text: currentSettings.year + " total: " + parsedData.total
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

    return commitsPerUserPromise;
  },

  /**
   * Runs the DB-Query and parses the result set.
   * @param  {Object} currentSettings      The global UI globalSettings and
   *                                       the specific UI globalSettings for product metrics.
   * @return {Promise} A Promise instance.
   */
  getCommitsPerModule( currentSettings ) {
    var commitsPerModulePromise = new Promise( function( resolve, reject ) {
      var select = "";
      var fromTables = "";
      var conditions = "";
      var query = "";
      var params = { };

      if( currentSettings && currentSettings.project && currentSettings.project.id ) {
        if( currentSettings.dict == null ) {
          reject( "Please select a 'src' dictionary!" );
        } else if( currentSettings.uid == null ) {
          reject( "Please select a user!" );
        } else {
          select = "SELECT "
            + " Categories.name as category, Commits.title, Commits.date as date, Files.name as filename, "
            + " CAST(strftime('%m', Commits.date) AS INTEGER) as month, COUNT(DISTINCT(Commits.id)) as amount ";
          fromTables = "FROM "
            + " Files, FileChanges, Commits, CommitCategories, Categories ";
          conditions = "WHERE "
            + " Files.id = FileChanges.file "
            + " AND FileChanges.commitId = Commits.id "
            + " AND Commits.id = CommitCategories.commitId "
            + " AND CommitCategories.category = Categories.id "
            + " AND Files.project = $project "
            + " AND Categories.dictionary = $dict ";

          params = {
            $project: currentSettings.pid,
            $dict: currentSettings.dict
          };

          if( currentSettings.year !== "all" ) {
            if( currentSettings.uid < 0 ) {
              conditions += " AND CAST(strftime('%Y', Commits.date) AS INTEGER) = $year ";
              params[ '$year' ] = currentSettings.year;
            } else {
              conditions += " AND Commits.author = $author "
                + " AND CAST(strftime('%Y', Commits.date) AS INTEGER) = $year ";
              params[ '$author' ] = currentSettings.uid;
              params[ '$year' ] = currentSettings.year;
            }
          } else {
            if( currentSettings.uid < 0 ) {
              // default query
            } else {
              conditions += " AND Commits.author = $author ";
              params[ '$author' ] = currentSettings.uid;
            }
          }

          query += select + fromTables + conditions;
          query += " GROUP BY strftime('%Y-%m-%d', Commits.date) ";

          db.all( query, params, function( err, cats ) {
            if( err ) {
              console.log( err );
              reject( err );
            }

            if( cats && cats.length > 0 ) {
              if( currentSettings.pmSettings.module && currentSettings.pmSettings.module.name &&
                  currentSettings.pmSettings.module.name != "-1" ) {
                cats = Commit.filterModuleFiles( cats, currentSettings.pmSettings.module.name );

                console.log( "============AFTER FILTER MODULE FILES================" );
                console.log( cats );
              }

              var parsedData = Commit.parseCommitCatsData( cats, currentSettings.year );

              var chartData = {
                series: parsedData.series,
                title: {
                  text: "Commits per module"
                },
                subtitle: {
                  text: currentSettings.year + " total: " + parsedData.total
                },
                yAxis: {
                  title: {
                    text: "Commits"
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

    return commitsPerModulePromise;
  },

  getLocPerCommit( currentSettings ) {
    var locPerCommitPromise = new Promise( function( resolve, reject ) {
      var select = "";
      var fromTables = "";
      var conditions = "";
      var query = "";
      var params = { };

      if( currentSettings && currentSettings.project && currentSettings.project.id ) {
        if( currentSettings.dict == null ) {
          reject( "Please select a 'src' dictionary!" );
        } else if( currentSettings.uid == null ) {
          reject( "Please select a user!" );
        } else {
          select = "SELECT "
            + " Categories.name as category, Commits.title, Commits.date as date, "
            + " CAST(strftime('%m', Commits.date) AS INTEGER) as month ";
          fromTables = "FROM "
            + " Commits, CommitCategories, Categories ";
          conditions = "WHERE Commits.id = CommitCategories.commitId "
            + " AND CommitCategories.category=Categories.id "
            + " AND Categories.dictionary = $dict "                                   // dict
            + " AND Commits.project = $project ";                                      // project

          params = {
            $project: currentSettings.pid,
            $dict: currentSettings.dict
          };

          if( currentSettings.year !== "all" ) {
            if( currentSettings.uid < 0 ) {
              conditions += " AND CAST(strftime('%Y', Commits.date) AS INTEGER) = $year ";
              params[ '$year' ] = currentSettings.year;
            } else {
              conditions += " AND Commits.author = $author "
                + " AND CAST(strftime('%Y', Commits.date) AS INTEGER) = $year ";
              params[ '$author' ] = currentSettings.uid;
              params[ '$year' ] = currentSettings.year;
            }
          } else {
            if( currentSettings.uid < 0 ) {
              // default query
            } else {
              conditions += " AND Commits.author = $author ";
              params[ '$author' ] = currentSettings.uid;
            }
          }

          if( currentSettings.pmSettings.loc ) {
            if( currentSettings.pmSettings.loc === "added" ) {
              select += ", Commits.linesAdded as amount ";
            } else {
              select += ", Commits.linesRemoved as amount ";
            }
          }

          query += select + fromTables + conditions;
          query += " GROUP BY strftime('%Y-%m-%d', Commits.date) ";

          db.all( query, params, function( err, cats ) {
            if( err ) {
              console.log( err );
              reject( err );
            }

            if( cats.length > 0 ) {
              var parsedData = Commit.parseCommitCatsData( cats, currentSettings.year );

              var chartData = {
                series: parsedData.series,
                title: {
                  text: "LOC per Commit"
                },
                subtitle: {
                  text: currentSettings.year + " total: " + parsedData.total
                },
                yAxis: {
                  title: {
                    text: "LOC"
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

    return locPerCommitPromise;
  },

  filterModuleFiles( cats, moduleName ) {
    var folderRegex = new RegExp( /^.*\// );
    var folderMatch = null;
    var fileName = "";
    var files = { };
    var fileCats = [ ];

    _.forEach( cats, (cat, i) => {
      fileName = cat.filename.replace( moduleName + "/", "" );

      if( fileName !== cat.filename ) {
        folderMatch = fileName.match( folderRegex );

        if( folderMatch === null ) {
          fileCats.push( cat );
        }
      }
    } );

    return fileCats;
  }

};

module.exports = Commit;