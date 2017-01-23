var config = require('../../config/config');
var hbs = require('hbs');
var Util = require('../../helpers/util');
var Promise = require('bluebird');

// load the modern build
var _ = require('lodash');

var db = require( '../../db/db' );
var queries = require( '../../db/queries' );


Sentiment = {
  getMaxOutliers( fromTables, conditions, params, data, attribute ) {
    let outlierFences = Sentiment.getOutlierFences( data );

    let select = "SELECT DISTINCT(" + attribute + ") as max";
    conditions += " AND (" + attribute + ") > " + outlierFences.outlierMax;

    let query = select + fromTables + conditions;

    return query;
  },

  getOutlierFences( data ) {
    // interquartile range
    let IQR = data.q3 - data.q1;

    let outlierMin = data.q1 - 1.5 * IQR;
    let outlierMax = data.q3 + 1.5 * IQR;

    let extremeMin = data.q1 - 3 * IQR;
    let extremeMax = data.q3 + 3 * IQR;

    return {
      outlierMin: outlierMin,
      outlierMax: outlierMax,
      extremeMin: extremeMin,
      extremeMax: extremeMax
    };
  },

  buildBoxPlotData( record ) {
    let boxPlotData = {};
    let series = [];

    series.push( {
      name: "Sentiments per commit",
      data: [
        [
          record.min,
          record.q1,
          record.median,
          record.q3,
          record.max
        ]
      ]
    } );

    boxPlotData.series = series;
    boxPlotData.meanData = record.avg;

    return boxPlotData;
  },

  getAttributeQueryString( attribute ) {
    switch( attribute ) {
      case "LOC":
        return "c.linesAdded + c.linesRemoved";
        break;
      case "linesAdded":
        return "linesAdded";
        break;
      case "linesRemoved":
        return "linesRemoved";
        break;
      case "sentences":
        return "sentences";
        break;
      case "words":
        return "wordCount";
        break;
      default: return {};
    }
  },

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

  getSentimentsPerCommit( currentSettings ) {
    var sentimentPerSentimentPromise = new Promise( function( resolve, reject ) {
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

          select = "SELECT "
            + " strftime('%m', c.date) as month, "
            + " AVG(" + attQueryString + ") as avg, "
            + " MEDIAN(" + attQueryString + ") as median, "
            + " LOWER_QUARTILE(" + attQueryString + ") as q1, "
            + " UPPER_QUARTILE(" + attQueryString + ") as q3, "
            + " MIN(" + attQueryString + ") as min, "
            + " MAX(" + attQueryString + ") as max, "
            + " COUNT(*) as amount"
          fromTables = " FROM "
            + " Commits c, Categories cat, CommitCategories cc, "
            + " Sentiment s, CommitSentiment cs ";
          conditions = " WHERE "
            + " c.project = $project "
            + " AND cs.commitId = c.id "
            + " AND cs.sentimentId = s.id "
            + " AND cc.category = cat.id "
            + " AND cat.dictionary = $dict "               // dict
            + " AND (CASE WHEN $category = -1 THEN 1 ELSE cc.category = $category END) "
            + "   AND (CASE WHEN " + sentiment + " = 200 THEN 1 "
            + "             WHEN " + sentiment + " = 2 THEN s.positive = MAX (s.positive,s.somewhatPositive,s.neutral,s.somewhatNegative,s.negative) "
            + "             WHEN " + sentiment + " = 1 THEN s.somewhatPositive = MAX (s.positive,s.somewhatPositive,s.neutral,s.somewhatNegative,s.negative) "
            + "             WHEN " + sentiment + " = 0 THEN s.neutral = MAX (s.positive,s.somewhatPositive,s.neutral,s.somewhatNegative,s.negative) "
            + "             WHEN " + sentiment + " = -1 THEN s.somewhatNegative = MAX (s.positive,s.somewhatPositive,s.neutral,s.somewhatNegative,s.negative) "
            + "             WHEN " + sentiment + " = -2 THEN s.negative = MAX (s.positive,s.somewhatPositive,s.neutral,s.somewhatNegative,s.negative) "
            + "       END) ";

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
                var parsedData = Sentiment.buildBoxPlotData( record );
                var q = Sentiment.getMaxOutliers( fromTables, conditions, params, record, attQueryString );

                db.all( q, params, ( err, maxOutliers ) => {
                  let mol = [];

                  _.each( maxOutliers, ( mo ) => {
                    mol.push( [ 0, mo.max ] );
                  } );

                  parsedData.series[ 0 ].data[ 0 ][ 4 ] = Sentiment.getOutlierFences( record ).outlierMax;

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

                  var chartData = {
                    series: parsedData.series,
                    title: {
                      text: "Sentiment per commit"
                    },

                    xAxis: {
                      categories: [ category ],
                      title: {
                        text: "Category"
                      }
                    },

                    yAxis: {
                      title: {
                        text: attribute
                      },
                      plotLines: [{
                        value: parsedData.meanData,
                        color: 'red',
                        width: 1,
                        label: {
                          text: 'Theoretical mean: ' + parsedData.meanData,
                          align: 'center',
                          style: {
                            color: 'gray'
                          }
                        }
                      }]
                    }
                  };
                  resolve( chartData );
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

    return sentimentPerSentimentPromise;
  }

};

module.exports = Sentiment;