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
        height: 300
      },
      title: {
        text: opts.title.text
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

  var module = {

    createPieChart: function( container, opts ) {
      opts.container = container;

      pieChart( opts );
    }
  };

  return module;

})(jQuery, _);