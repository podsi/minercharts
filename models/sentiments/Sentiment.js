var config = require('../../config/config');
var hbs = require('hbs');
var Util = require('../../helpers/util');
var Common = require( '../common/Common' );
var Promise = require('bluebird');

// load the modern build
var _ = require('lodash');

var db = require( '../../db/db' );
var queries = require( '../../db/queries' );


Sentiment = {
  parseSentimentsPerBugData( cats, year ) {
    var series = { };
    var monthTotal = { };
    var total = 0;
    var data = [ ];
    var point;

    console.log( '===================CATEGORY====================' );
    console.log( cats );

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

    _.forEach( series, (obj,key) => {
      obj.name = key + " (" + obj.amount + ")";
      obj.data = _.sortByOrder( obj.data, [ "x" ], [ "asc" ] );
      data.push( obj );
    } );

    return { series: data, total: total };
  },

  getAttributeQueryString( attribute ) {
    let attr = "c.linesAdded + c.linesRemoved"

    switch( attribute ) {
      case "LOC":
        attr = "c.linesAdded + c.linesRemoved";
        break;
      case "linesAdded":
        attr = "linesAdded";
        break;
      case "linesRemoved":
        attr = "linesRemoved";
        break;
      case "sentences":
        attr = "sentences";
        break;
      case "words":
        attr = "wordCount";
        break;
    }

    return attr;
  },

  getPerBugQuery( sentiment, filterCondition ) {
    return {
      select: `
        SELECT
          CAST(strftime('%m', cmnt.creation) AS INTEGER) as month,
          cat.name as category,
          cmnt.creation as date,
          COUNT(DISTINCT(cmnt.id)) as amount`,
      fromTables: `
        FROM
          SentenceSentiment ss,
          BlockSentiment bs,
          Sentiment s,
          BugCommentSentiment bcs,
          Comments cmnt,
          Bugs b,
          Components cmpnt,
          Categories cat,
          BugCategories bc`,
      conditions: `
        WHERE
          ss.groupId=bs.id
          AND bs.sentimentId=s.id
          AND bcs.sentimentId=s.id
          AND cmnt.id=bcs.commentId
          AND cmnt.bug = b.id
          AND cmpnt.id = b.component
          AND b.id = bc.bug
          AND bc.category = cat.id
          AND cat.dictionary = $dict
          AND cmpnt.project = $project
          AND (CASE
          	WHEN ${sentiment} = 2 THEN ss.positive = MAX(ss.negative,ss.somewhatNegative,ss.neutral,ss.somewhatPositive,ss.positive)
            WHEN ${sentiment} = 1 THEN ss.somewhatPositive = MAX(ss.negative,ss.somewhatNegative,ss.neutral,ss.somewhatPositive,ss.positive)
            WHEN ${sentiment} = 0 THEN ss.neutral = MAX(ss.negative,ss.somewhatNegative,ss.neutral,ss.somewhatPositive,ss.positive)
            WHEN ${sentiment} =-1 THEN ss.somewhatNegative = MAX(ss.negative,ss.somewhatNegative,ss.neutral,ss.somewhatPositive,ss.positive)
            WHEN ${sentiment} =-2 THEN ss.negative = MAX(ss.negative,ss.somewhatNegative,ss.neutral,ss.somewhatPositive,ss.positive)
            WHEN ${sentiment} = 200 THEN 1
          END)
          ${filterCondition}
        `
    }
  },

  getPerCommitQuery( attQueryString, sentiment ) {
    return { 
      select: `SELECT 
        strftime('%m', c.date) as month,
        AVG(${attQueryString}) as avg,
        MEDIAN(${attQueryString}) as median,
        LOWER_QUARTILE(${attQueryString}) as q1,
        UPPER_QUARTILE(${attQueryString}) as q3,
        MIN(${attQueryString}) as min,
        MAX(${attQueryString}) as max,
        COUNT(*) as amount`,

      fromTables: ` 
        FROM 
          Commits c, Categories cat, CommitCategories cc,
          Sentiment s, CommitSentiment cs`,

      conditions: ` 
        WHERE
          c.project = $project
          AND cs.commitId = c.id
          AND cs.sentimentId = s.id
          AND cc.category = cat.id
          AND cat.dictionary = $dict
          AND (CASE WHEN $category = -1 THEN 1 ELSE cc.category = $category END)
          AND (
            CASE WHEN ${sentiment} = 200 THEN 1
              WHEN ${sentiment} = 2 THEN s.positive = MAX (s.positive,s.somewhatPositive,s.neutral,s.somewhatNegative,s.negative)
              WHEN ${sentiment} = 1 THEN s.somewhatPositive = MAX (s.positive,s.somewhatPositive,s.neutral,s.somewhatNegative,s.negative)
              WHEN ${sentiment} = 0 THEN s.neutral = MAX (s.positive,s.somewhatPositive,s.neutral,s.somewhatNegative,s.negative)
              WHEN ${sentiment} = -1 THEN s.somewhatNegative = MAX (s.positive,s.somewhatPositive,s.neutral,s.somewhatNegative,s.negative)
              WHEN ${sentiment} = -2 THEN s.negative = MAX (s.positive,s.somewhatPositive,s.neutral,s.somewhatNegative,s.negative)
            END
          )`
    }
  },

  getSentimentsPerCommit( currentSettings ) {
    var sentimentsPerCommit = new Promise( function( resolve, reject ) {
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
          if( !currentSettings.pmSettings ) {
            reject( "No sentiment settings set, using default settings." );
          }

          let categoryId = -1;
          let category = "All";

          if( !currentSettings.pmSettings.category ) {
            console.log( "No category set, using all category as default." );
          } else {
            categoryId = currentSettings.pmSettings.category.id;
            category = currentSettings.pmSettings.category.name;
          }

          var sentiment = currentSettings.pmSettings.sentiment || 200;
          var attribute = currentSettings.pmSettings.attribute || "LOC";
          var attQueryString = Sentiment.getAttributeQueryString( attribute );

          var { select, fromTables, conditions } = Sentiment.getPerCommitQuery( attQueryString, sentiment ) 

          params = {
            $project: currentSettings.pid,
            $dict: currentSettings.dict,
            $category: categoryId
          };

          if( currentSettings.year !== "all" ) {
            if( currentSettings.uid < 0 ) {
              conditions += " AND CAST(strftime('%Y', c.date) AS INTEGER) = $year ";
              params[ '$year' ] = currentSettings.year;
            } else {
              conditions += " AND c.author = $author "
                + " AND CAST(strftime('%Y', c.date) AS INTEGER) = $year ";
              params[ '$author' ] = currentSettings.uid;
              params[ '$year' ] = currentSettings.year;
            }
          } else {
            if( currentSettings.uid < 0 ) {
              // default query
            } else {
              conditions += " AND c.author = $author ";
              params[ '$author' ] = currentSettings.uid;
            }
          }

          query += select + fromTables + conditions;

          db.serialize( ( ) => {
            db.get( query, params, function( err, record ) {
              if( err ) {
                console.log( err );
                reject( err );
              }

              if( record.amount > 0 ) {
                var parsedData = Common.buildBoxPlotData( record, { name: "Sentiments per commit" } );
                var q = Common.getMaxOutliers( fromTables, conditions, params, record, attQueryString );

                db.all( q, params, ( err, maxOutliers ) => {
                  let mol = [];

                  _.each( maxOutliers, ( mo ) => {
                    mol.push( [ 0, mo.max ] );
                  } );

                  parsedData.series[ 0 ].data[ 0 ][ 4 ] = Common.getOutlierFences( record ).outlierMax;

                  parsedData.series.push( {
                    name: 'Outlier',
                    color: '#7cb5ec',
                    type: 'scatter',
                    data: mol,
                    marker: {
                        fillColor: 'white',
                        lineWidth: 1,
                        lineColor: '#7cb5ec'
                    },
                    tooltip: {
                      pointFormat: `${attribute}: {point.y}`
                    }
                  } );

                  resolve( Common.buildHighchartsBoxPlotObj( {
                    series: parsedData.series,
                    title: "Sentiment per commit",
                    xAxisTitle: "Category",
                    category,
                    attribute,
                    meanData: parsedData.meanData
                  } ) );
                } );
              } else {
                reject( "Couldn't find any information with current settings!" );
              }
            } ) ;
          } );
        }
      } else {
        reject( "Please select a project!" );
      }
    } );

    return sentimentsPerCommit;
  },

  getSentimentsPerBug( currentSettings ) {
    var sentimentsPerBug = new Promise( function( resolve, reject ) {
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
          if( !currentSettings.pmSettings ) {
            reject( "No sentiment settings set, using default settings." );
          }

          let categoryId = -1;
          let category = "All";

          if( !currentSettings.pmSettings.category ) {
            console.log( "No category set, using all category as default." );
          } else {
            categoryId = currentSettings.pmSettings.category.id;
            category = currentSettings.pmSettings.category.name;
          }

          var sentiment = currentSettings.pmSettings.sentiment || 200;
          var filter = currentSettings.pmSettings.filter || {};
          var filterCondition = Common.getBugFilterCondition( filter );
          
          var { select, fromTables, conditions } = Sentiment.getPerBugQuery( sentiment, filterCondition );

          params = {
            $project: currentSettings.pid,
            $dict: currentSettings.dict
          };

          if( currentSettings.year !== "all" ) {
            if( currentSettings.uid < 0 ) {
              conditions += " AND CAST(strftime('%Y', cmnt.creation) AS INTEGER) = $year ";
              params[ '$year' ] = currentSettings.year;
            } else {
              conditions += " AND b.identity = $author "
                + " AND CAST(strftime('%Y', cmnt.creation) AS INTEGER) = $year";
              params[ '$author' ] = currentSettings.uid;
              params[ '$year' ] = currentSettings.year;
            }
          } else {
            if( currentSettings.uid < 0 ) {
              // default query
            } else {
              conditions += " AND b.identity = $author ";
              params[ '$author' ] = currentSettings.uid;
            }
          }

          query += select + fromTables + conditions;
          query += " GROUP BY strftime('%Y-%m-%d', cmnt.creation) ";

          db.all( query, params, function( err, cats ) {
            if( err ) {
              console.log( err );
              reject( err );
            }

            if( cats.length > 0 ) {
              var parsedData;
              var chartData = {
                title: {
                  text: "Sentiment per bug"
                }
              };

              parsedData = Sentiment.parseSentimentsPerBugData( cats, currentSettings.year );

              chartData.series = parsedData.series;
              chartData.yAxis = {
                title: {
                  text: "Commits"
                }
              };

              chartData.subtitle = {
                text: currentSettings.year + " total: " + parsedData.total
              };

              resolve( chartData );
            } else {
              reject( "Couldn't find any bugs for user '" + currentSettings.uname
                + "'. Try to change the filters (project, dictionary, year)!" );
            }
          } );

        }
      } else {
        reject( "Please select a project!" );
      }
    } );

    return sentimentsPerBug;
  }

  // THE FOLLOWING FUNCTIONS WHERE USED TO CALCULATE THE DATA FOR THE BOX PLOT
  // NOW THE extension-functions for sqlite3 ARE USED TO CALCULATE IT
  //
  // parseForBoxPlot( records, year, attribute ) {
  //   switch( attribute ) {
  //     case "LOC":
  //       const sums = _.map( records, c => {
  //         return c.linesAdded + c.linesRemoved;
  //       } );
  //       return Sentiment.calcBoxPlotData( sums );
  //       break;
  //     case "linesAdded":
  //       const linesAdded = _.pluck( records, "linesAdded" );
  //       return Sentiment.calcBoxPlotData( linesAdded );
  //       break;
  //     case "linesRemoved":
  //       const linesRemoved = _.pluck( records, "linesRemoved" );
  //       return Sentiment.calcBoxPlotData( linesRemoved );
  //       break;
  //     case "sentences":
  //       const sentences = _.pluck( records, "sentences" );
  //       return Sentiment.calcBoxPlotData( sentences );
  //       break;
  //     case "words":
  //       const wordCount = _.pluck( records, "wordCount" );
  //       return Sentiment.calcBoxPlotData( wordCount );
  //       break;
  //     default: return {};
  //   }
  // },

  // calcBoxPlotData( data ) {
  //   var numberOfBoxes = 1;
  //   var boxPlotData = {
  //     boxData: [ ],
  //     meanData: [ ]
  //   };

  //   var boxData  = [ ];
  //   var meanData = [ ];

  //   for(var i = 0; i < numberOfBoxes; i++) {
  //     var boxValues  = Sentiment.getBoxValues( data );

  //     boxPlotData.boxData.push( boxValues );
  //     boxPlotData.meanData.push( boxValues.avg );
  //   }

  //   let series = [];

  //   series.push( {
  //     name: "Sentiments per commit",
  //     data: [
  //       [
  //         boxPlotData.boxData[ 0 ].min,
  //         boxPlotData.boxData[ 0 ].q1,
  //         boxPlotData.boxData[ 0 ].median,
  //         boxPlotData.boxData[ 0 ].q3,
  //         boxPlotData.boxData[ 0 ].max
  //       ]
  //     ]
  //   } );

  //   boxPlotData.series = series;

  //   return boxPlotData;
  // },

  // getBoxValues( data ) {
  //   var boxValues = { };

  //   boxValues.avg = Sentiment.mean( data );
  //   boxValues.min = _.min( data );
  //   boxValues.q1 = Sentiment.getPercentile( data, 25 );
  //   boxValues.median = Sentiment.getPercentile( data, 50 );
  //   boxValues.q3 = Sentiment.getPercentile( data, 75 );
  //   boxValues.max = _.max( data );

  //   return boxValues;
  // },

  // getPercentile( data, percentile ) {
  //   data.sort( );

  //   var index = ( percentile / 100 ) * data.length;
  //   var result;

  //   if( Math.floor( index ) == index ) {
  //     result = ( data[ ( index - 1 ) ] + data[ index ] ) / 2;
  //   }
  //   else {
  //     result = data[ Math.floor( index ) ];
  //   }

  //   return result;
  // },

  // mean( data ) {
  //   return _.sum( data ) / data.length;
  // },

};

module.exports = Sentiment;