var config = require('../../config/config');
var hbs = require('hbs');
var Util = require('../../helpers/util');
var Promise = require('bluebird');

// load the modern build
var _ = require('lodash');

var db = require( '../../db/db' );
var queries = require( '../../db/queries' );


Sentiment = {
  /**
   * Parsing the data returned by the DB-Query (result set).
   * @param  {Array} cats          The categories for each Sentiment grouped by.
   * @param  {String} year          The year which is used for the total dataset.
   * @return {Object} An object with keys "series" & "total".
   */
  parseSentimentCatsData( cats, year ) {
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

  parseForBoxPlot( records, year, attribute ) {
    switch( attribute ) {
      case "LOC":
        const sums = _.map( records, c => {
          return c.linesAdded + c.linesRemoved;
        } );
        return Sentiment.calcBoxPlotData( sums );
        break;
      case "linesAdded":
        const linesAdded = _.pluck( records, "linesAdded" );
        return Sentiment.calcBoxPlotData( linesAdded );
        break;
      case "linesRemoved":
        const linesRemoved = _.pluck( records, "linesRemoved" );
        return Sentiment.calcBoxPlotData( linesRemoved );
        break;
      case "sentences":
        const sentences = _.pluck( records, "sentences" );
        return Sentiment.calcBoxPlotData( sentences );
        break;
      case "words":
        const wordCount = _.pluck( records, "wordCount" );
        return Sentiment.calcBoxPlotData( wordCount );
        break;
      default: return {};
    }
  },

  calcBoxPlotData( data ) {
    var numberOfBoxes = 1;
    var boxPlotData = {
      boxData: [ ],
      meanData: [ ]
    };

    var boxData  = [ ];
    var meanData = [ ];

    for(var i = 0; i < numberOfBoxes; i++) {
      var boxValues  = Sentiment.getBoxValues( data );

      boxPlotData.boxData.push( boxValues );
      boxPlotData.meanData.push( Sentiment.mean( data ) );
    }

    let series = [];

    series.push( {
      name: "Sentiments per commit",
      data: [
        [
          boxPlotData.boxData[ 0 ].min,
          boxPlotData.boxData[ 0 ].q1,
          boxPlotData.boxData[ 0 ].median,
          boxPlotData.boxData[ 0 ].q3,
          boxPlotData.boxData[ 0 ].max
        ]
      ]
    } );

    boxPlotData.series = series;

    return boxPlotData;
  },

  getBoxValues( data ) {
    var boxValues = { };

    boxValues.avg = Sentiment.mean( data );
    boxValues.min = _.min( data );
    boxValues.q1 = Sentiment.getPercentile( data, 25 );
    boxValues.median = Sentiment.getPercentile( data, 50 );
    boxValues.q3 = Sentiment.getPercentile( data, 75 );
    boxValues.max = _.max( data );

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
    return _.sum( data ) / data.length;
  },

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
          var sentiment = currentSettings.pmSettings.sentiment;

          select = "SELECT "
            // + " strftime('%m', c.date) as month, "
            + " c.linesAdded, c.linesRemoved, s.sentences, s.wordCount ";
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
            $category: currentSettings.pmSettings.category.id
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
          // query += " GROUP BY strftime('%m', c.date)";

          db.all( query, params, function( err, cats ) {
            if( err ) {
              console.log( err );
              reject( err );
            }

            if( cats.length > 0 ) {
              // TODO: for sentiments --> collect data for each month (so each record)
              var attribute = currentSettings.pmSettings.attribute || "LOC";
              var parsedData = Sentiment.parseForBoxPlot( cats, currentSettings.year, attribute );

              var chartData = {
                series: parsedData.series,
                title: {
                  text: "Sentiment per commit"
                },
                yAxis: {
                  title: {
                    text: 'Sentiments'
                  },
                  plotLines: [{
                    value: parsedData.meanData[ 0 ],
                    color: 'red',
                    width: 1,
                    label: {
                      text: 'Theoretical mean: ' + parsedData.meanData[ 0 ],
                      align: 'center',
                      style: {
                        color: 'gray'
                      }
                    }
                  }]
                }
              };

              resolve( chartData );
            } else {
              reject( "Couldn't find any information with current settings!"
                + " Try to change the filters (project, dictionary, year)!" );
            }
          } ) ;
        }
      } else {
        reject( "Please select a project!" );
      }
    } );

    return sentimentPerSentimentPromise;
  }

};

module.exports = Sentiment;