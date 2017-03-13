var config = require('../../config/config');
var Promise = require('bluebird');

// load the modern build
var _ = require('lodash');

var db = require( '../../db/db' );
var queries = require( '../../db/queries' );

Common = {
  getBugCategories( project ) {
    var promise = new Promise( (resolve, reject) => {
      let query = `
        SELECT
          DISTINCT cat.id, cat.name
        FROM
          Categories cat, Bugs b, BugCategories, Components
        WHERE
          Components.id = b.component
          AND b.id = BugCategories.bug
          AND Components.project = ?
          AND cat.id = BugCategories.category
      `;

      let params = [ project.id ];

      if( project.dictionary && project.dictionary.context != "all" ) {
        if( project.year && project.year != "all" ) {
          query += " AND cat.dictionary = ? "
            + " AND CAST(strftime('%Y', b.creation) AS INTEGER) = ? ";
          params.push( project.dictionary.id );
          params.push( project.year );

        } else {
          query += " AND cat.dictionary = ? ";
          params.push( project.dictionary.id );
        }
      } else {
        if( project.year && project.year != "all" ) {
          query += " AND CAST(strftime('%Y', b.creation) AS INTEGER) = ? ";
          params.push( project.year );
        } else {
          // default query & params
        }
      }

      query += " ORDER BY cat.name"

      db.all( query, params, function( err, records ) {
        if( err ) {
          console.log( err );
          reject( err );
        }

        if( records.length > 0 ) {
          resolve( records );
        } else {
          reject( "Couldn't find any priorities!" );
        }
      } );
    } );

    return promise;
  },

  getPriorities( project ) {
    var promise = new Promise( (resolve, reject) => {
      const query = `SELECT id, name FROM Priorities WHERE project = $project`;
    
      const params = { 
        $project: project.id
      };

      db.all( query, params, function( err, records ) {
        if( err ) {
          console.log( err );
          reject( err );
        }

        if( records.length > 0 ) {
          resolve( records );
        } else {
          reject( "Couldn't find any priorities!" );
        }
      } );
    } );

    return promise;
  },
  
  getSeverities( project ) {
    var promise = new Promise( (resolve, reject) => {
      const query = `SELECT id, name FROM Severity WHERE project = $project`;
      
      const params = { 
        $project: project.id
      };

      db.all( query, params, function( err, records ) {
        if( err ) {
          console.log( err );
          reject( err );
        }

        if( records.length > 0 ) {
          resolve( records );
        } else {
          reject( "Couldn't find any severities!" );
        }
      } );
    } );

    return promise;
  },
  
  getResolutions( project ) {
    var promise = new Promise( (resolve, reject) => {
      const query = `SELECT id, name FROM Resolutions WHERE project = $project`;
      
      const params = { 
        $project: project.id
      };

      db.all( query, params, function( err, records ) {
        if( err ) {
          console.log( err );
          reject( err );
        }

        if( records.length > 0 ) {
          resolve( records );
        } else {
          reject( "Couldn't find any resolutions!" );
        }
      } );
    } );
    
    return promise;
  },
  
  getOperationSystems( project ) {
    var promise = new Promise( (resolve, reject) => {
      const query = `SELECT id, name FROM OperatingSystems WHERE project = $project`;
      
      const params = { 
        $project: project.id
      };

      db.all( query, params, function( err, records ) {
        if( err ) {
          console.log( err );
          reject( err );
        }

        if( records.length > 0 ) {
          resolve( records );
        } else {
          reject( "Couldn't find any operating systems!" );
        }
      } );
    } );

    return promise;
  },
  
  getPlatforms( project ) {
    var promise = new Promise( (resolve, reject) => {
      const query = `SELECT id, name FROM Platforms WHERE project = $project`;
      
      const params = { 
        $project: project.id
      };

      db.all( query, params, function( err, records ) {
        if( err ) {
          console.log( err );
          reject( err );
        }

        if( records.length > 0 ) {
          resolve( records );
        } else {
          reject( "Couldn't find any platforms!" );
        }
      } );
    } );

    return promise;
  },
  
  getVersions( project ) {
    var promise = new Promise( (resolve, reject) => {
      const query = `SELECT id, name FROM Versions WHERE project = $project`;
      
      const params = { 
        $project: project.id
      };

      db.all( query, params, function( err, records ) {
        if( err ) {
          console.log( err );
          reject( err );
        }

        if( records.length > 0 ) {
          resolve( records );
        } else {
          reject( "Couldn't find any versions!" );
        }
      } );
    } );

    return promise;
  },

  getBugFilterCondition( filter ) {
    let filterCond = [];

    if( filter[ "priority" ] && filter[ "priority" ] > 0 ) {
      filterCond.push( `b.priority = ${filter[ "priority" ]}` );
    }

    if( filter[ "severity" ] && filter[ "severity" ] > 0 ) {
      filterCond.push( `b.severity = ${filter[ "severity" ]}` );
    }

    if( filter[ "resolution" ] && filter[ "resolution" ] > 0 ) {
      filterCond.push( `b.resolution = ${filter[ "resolution" ]}` );
    }

    if( filter[ "opsys" ] && filter[ "opsys" ] > 0 ) {
      filterCond.push( `b.operatingSystem = ${filter[ "opsys" ]}` );
    }

    if( filter[ "platform" ] && filter[ "platform" ] > 0 ) {
      filterCond.push( `b.platform = ${filter[ "platform" ]}` );
    }

    if( filter[ "version" ] && filter[ "version" ] > 0 ) {
      filterCond.push( `b.version = ${filter[ "version" ]}` );
    }

    let filterStr = filterCond.join( " AND " );

    if( filterCond.length > 0 ) {
      filterStr = ` AND ${filterStr} `;
    }

    return filterStr;
  },

  // BOXPLOT

  getMaxOutliers( fromTables, conditions, params, data, attribute ) {
    let outlierFences = Common.getOutlierFences( data );

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
      outlierMin,
      outlierMax,
      extremeMin,
      extremeMax
    };
  },

  buildBoxPlotData( record, opts={} ) {
    let boxPlotData = {};
    let series = [];

    series.push( {
      name: opts.name,
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

  buildHighchartsBoxPlotObj( opts = {} ) {
    return {
      series: opts.series,
      title: {
        text: opts.title
      },

      xAxis: {
        categories: [ opts.category ],
        title: {
          text: opts.xAxisTitle
        }
      },

      yAxis: {
        title: {
          text: opts.attribute
        },
        plotLines: [{
          value: opts.meanData,
          color: 'red',
          width: 1,
          zIndex: 5,
          label: {
            text: 'Theoretical mean: ' + opts.meanData,
            align: 'center',
            style: {
              color: 'gray'
            }
          }
        }]
      }
    };
  }
};

module.exports = Common;