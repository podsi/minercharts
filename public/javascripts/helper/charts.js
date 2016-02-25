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
          month: '%b'
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
        spline: {
          marker: {
            enabled: true
          }
        }
      },

      series: opts.series
    });
  };

  var module = {

    createPieChart: function( container, opts ) {
      opts.container = container;

      pieChart( opts );
    },

    createDateLineChart: function( container, opts ) {
      opts.container = container;

      dateLineChart( opts );
    },

    createLineChart: function( container, opts ) {
    }
  };

  return module;

})(jQuery, _);