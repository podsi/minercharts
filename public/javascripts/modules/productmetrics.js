window.MC = window.MC || {};

window.MC.Productmetrics = (function( $ ) {

  var module = {
    currentView: { nav: "productmetrics" },

    init( ) {
      var active = $( "#productmetrics-tabs > li.active" ).
        children( "a" ).first( ).attr( "aria-controls");

      module.currentView.tab = active;
      MC.Settings.write( "currentView", module.currentView );

      module.render( );
    },

    render( ) {
      var project = MC.Settings.read( "project" ) || { };

      MC.ajax( {
        url: "/productmetrics/load",
        params: {
          project: project
        },

        done: function( data ) {
          $( "#productmetrics-panel" ).html( data.partials.pmBody );

          module.renderUsers( data );
          module.loadViewSettings( );

          module.registerUserChangedEvents( );
          module.registerEvents( );

          module.loadChart( data );
        }
      } );
    },

    renderUsers( data ) {
      $( "#" + module.currentView.tab + "_users" ).html( data.partials.users );
    },

    registerUserChangedEvents( ) {
      $( "#" + module.currentView.tab + "_users select[name='users']" ).on( "change", function( evt ) {
        module.setUserData( );
        module.loadChart( );
      } );
    },

    // ES6 Syntax
    registerEvents( ) {
      $( "#comloc_loc input" ).on( "change", function( ) {
        MC.Util.toggleRadio( this.el, $(this).val( ) );

        MC.Settings.write( "productmetrics.comloc.loc", $(this).val( ) );
        module.loadLoc( );
      } );

      $( "#comloc_charttype input" ).on( "change", function( ) {
        MC.Util.toggleRadio( this.el, $(this).val( ) );

        MC.Settings.write( "productmetrics.comloc.charttype", $(this).val( ) );
        module.loadLoc( );
      } );
    },

    resetView( ) {
      $( "#process-" + module.currentView.tab + "-chart" ).html( "<p><i>No data found</i></p>" );
    },

    setUserData( ) {
      var selector = "#" + module.currentView.tab + "_users select[name='users']";
      var user = $( selector ).val( );
      var uname = $( selector ).find(":selected").text( );

      var storagePath = module.currentView.nav + "." + module.currentView.tab;

      MC.Settings.write( storagePath + ".user.id", user );
      MC.Settings.write( storagePath + ".user.name", uname );
    },

    loadViewSettings( ) {
      var nav = module.currentView.nav;
      var tab = module.currentView.tab;

      var storagePath = nav + "." + tab;
      var pmSettings = MC.Settings.read( nav );
      var userSelector = "#" + tab + "_users select[name='users']";

      var chartType = "trend";
      if( pmSettings && pmSettings[ tab ]
        && pmSettings[ tab ].charttype ) {
        chartType = pmSettings[ tab ].charttype;
      }

      if( tab === "comloc" ) {
        MC.Settings.write( storagePath + ".charttype", chartType );
        MC.Util.toggleRadio( "#" + tab + "_charttype input", chartType );
      }

      module.setUserData( );
    },

    loadChart( data ) {
      var tab = module.currentView.tab;

      if( tab === "comuser" ) module.loadCommitsPerUser( );
      else if( tab === "comloc" ) module.loadLoc( );
      else if( tab === "comsentiment" ) module.loadSentimentsPerCommit( );
    },

    loadCommitsPerUser( opts ) {
      MC.ajax( {
        url: "/productmetrics/commit_user/per_user",
        params: {
          project: MC.Settings.read( "project" ) || { },
          pmSettings: MC.Settings.read( "productmetrics" )
        },

        done: function( data ) {
          MC.Charts.createDateLineChart( "#comuser-chart", data.comuser );
        },

        error: function( data ) {
          module.resetView( );
        }
      } );
    },

    loadSentimentsPerCommit( opts ) {
      MC.ajax( {
        url: "/productmetrics/commit_sentiment/per_commit",
        params: {
          project: MC.Settings.read( "project" ) || { },
          pmSettings: MC.Settings.read( "productmetrics" )
        },

        done: function( data ) {
          MC.Charts.createDateLineChart( "#comsentiment-chart", data.comsentiment );
        },

        error: function( data ) {
          module.resetView( );
        }
      } );
    },

    loadLoc( opts ) {
      var pmSettings = MC.Settings.read( "productmetrics" );
      var chartType = pmSettings.comloc.charttype;

      MC.ajax( {
        url: "/productmetrics/commit_loc/per_user",
        params: {
          project: MC.Settings.read( "project" ) || { },
          pmSettings: pmSettings,
        },

        done: function( data ) {
          if( chartType === "trend" ) {
            MC.Charts.createDateLineChart( "#product-comloc-chart", data.comloc );
          } else if( chartType === "boxplot" ) {

          }
        },

        error: function( data ) {
          module.resetView( );
        }
      } );
    }
  };

  return module;

})(jQuery);
