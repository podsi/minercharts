window.MC = window.MC || {};

window.MC.Charts = (function($, _) {

  var pieChart = function( opts ) {
    // Build the chart
    $( opts.container ).highcharts({
      chart: {
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false,
        type: 'pie',
        options3d: {
          enabled: true,
          alpha: 45,
          beta: 0
        },
        height: 300
      },
      title: {
        text: opts.title.text
      },
      subtitle: {
        text: opts.subtitle.text || ""
      },
      credits: {
        enabled: false
      },
      tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
      },
      plotOptions: {
        series: {
          turboThreshold: 100000
        },
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          dataLabels: {
            enabled: false
          },
          showInLegend: true
        }
      },
      series: [{
        name: opts.series.name,
        colorByPoint: true,
        data: opts.series.data
      }]
    });
  };

  var dateLineChart = function( opts ) {
    opts.series.dataLabels = {
      enabled: true,
      crop: false
      // allowOverlap: true
    };

    $( opts.container ).highcharts({
      chart: {
        type: 'spline',
        zoomType: 'x'
      },
      title: {
        text: opts.title.text
      },
      subtitle: {
        text: opts.subtitle.text || ""
      },
      credits: {
        enabled: false
      },
      xAxis: {
        type: 'datetime',
        dateTimeLabelFormats: {
          month: '%b \'%y'
        },
        title: {
          text: 'Date'
        }
      },
      yAxis: {
        title: {
          text: opts.yAxis.title.text
        },
        min: 0
      },
      tooltip: {
        headerFormat: '<b>{series.name}</b><br>',
        pointFormat: '{point.x:%e. %b %Y}: {point.y:.2f}'
      },

      plotOptions: {
        series: {
          turboThreshold: 100000
        },
        spline: {
          marker: {
            enabled: true
          }
        }
      },

      series: opts.series
    });
  };

  var basicBarChart = function( opts ) {
    opts.series.dataLabels = {
      enabled: true,
      crop: false
    };

    $( opts.container ).highcharts({
      chart: {
        type: 'column',
        zoomType: 'x'
      },
      title: {
        text: opts.title.text
      },
      subtitle: {
        text: opts.subtitle.text || ""
      },
      credits: {
        enabled: false
      },
      xAxis: {
        dateTimeLabelFormats: {
          month: '%b \'%y'
        },
        type: 'datetime',
        title: {
          text: 'Date'
        },
        crosshair: true,
        showEmpty: false
      },
      yAxis: {
        title: {
          text: opts.yAxis.title.text
        },
        min: 0
      },
      tooltip: {
        headerFormat: '<b>{series.name}</b><br>',
        pointFormat: '{point.x:%e. %b %Y}: {point.y:.2f}'
      },

      plotOptions: {
        spline: {
          marker: {
            enabled: true
          }
        },
        column: {
          pointWidth: 20,
          stacking: 'normal'
        }
      },

      series: opts.series
    });
  };

  var boxPlotChart = function( opts ) {
    $( opts.container ).highcharts( {
      chart: {
        type: 'boxplot'
      },

      title: opts.title,

      legend: {
        enabled: false
      },

      xAxis: {
        categories: ['1'],
        title: {
          text: 'Experiment No.'
        }
      },

      yAxis: opts.yAxis,

      series: opts.series
    });
  };

  var module = {

    createBasicBarChart: function( container, opts ) {
      opts.container = container;

      basicBarChart( opts );
    },

    createPieChart: function( container, opts ) {
      opts.container = container;

      pieChart( opts );
    },

    createDateLineChart: function( container, opts ) {
      opts.container = container;

      dateLineChart( opts );
    },

    createLineChart: function( container, opts ) {
    },

    createBoxPlotChart: function( container, opts ) {
      opts.container = container;

      boxPlotChart( opts );
    }
  };

  return module;

})(jQuery, _);