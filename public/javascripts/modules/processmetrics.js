window.MC = window.MC || {};

window.MC.Processmetrics = (function( $ ) {

  var module = {
    currentView: { nav: "processmetrics" },

    init( ) {
      var active = $( "#processmetrics-tabs > li.active" ).
        children( "a" ).first( ).attr( "aria-controls");

      module.currentView.tab = active;
      MC.Settings.write( "currentView", module.currentView );

      module.render( );
    },

    render( ) {
      var project = MC.Settings.read( "project" ) || { };

      MC.ajax( {
        url: "/processmetrics/load",
        params: {
          project: project
        },

        done: function( data ) {
          $( "#processmetrics-panel" ).html( data.partials.pmBody );

          module.renderUsers( data );
          module.loadViewSettings( );

          module.registerUserChangedEvents( );
          module.registerEvents( );

          module.loadChart( );
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
      $( "#bstatuser_status input" ).on( "change", function( ) {
        MC.Util.toggleRadio( this.el, $(this).val( ) );

        MC.Settings.write( "processmetrics.bstatuser.openclosed", $(this).val( ) );
        module.loadBugStatus( );
      } );

      $( "#bstatuser_charttype input" ).on( "change", function( ) {
        MC.Util.toggleRadio( this.el, $(this).val( ) );

        MC.Settings.write( "processmetrics.bstatuser.charttype", $(this).val( ) );
        module.loadBugStatus( );
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

      // $( userSelector ).attr( "selected", true );

      if( pmSettings && tab === "bstatuser" && pmSettings.bstatuser ) {
        var openclosed = "both";
        if( pmSettings.bstatuser.openclosed ) {
          openclosed = pmSettings.bstatuser.openclosed;
        }

        MC.Settings.write( storagePath + ".openclosed", openclosed );
        MC.Util.toggleRadio( "#bstatuser_status input", openclosed );
      }

      var chartType = "trend";
      if( pmSettings && pmSettings[ tab ]
        && pmSettings[ tab ].charttype ) {
        chartType = pmSettings[ tab ].charttype;
      }

      if( tab === "bstatuser" || tab === "commentsuser" ) {
        MC.Settings.write( storagePath + ".charttype", chartType );
        MC.Util.toggleRadio( "#" + tab + "_charttype input", chartType );
      }

      module.setUserData( );
    },

    loadChart( ) {
      var tab = module.currentView.tab;

      if( tab === "bcatsauthor" ) module.loadBugCats( );
      else if( tab === "bstatuser" ) module.loadBugStatus( );
      else if( tab === "commentsuser" ) module.loadComments( );
      else if( tab === "bugsuser" ) module.loadBugs( );
      else if( tab === "patchesuser" ) module.loadPatches( );
    },

    loadBugCats( opts ) {
      MC.ajax( {
        url: "/processmetrics/bug_cats/per_author",
        params: {
          project: MC.Settings.read( "project" ) || { },
          pmSettings: MC.Settings.read( "processmetrics" )
        },

        done: function( data ) {
          MC.Charts.createDateLineChart( "#process-bcatsauthor-chart", data.bcatsauthor );
        },

        error: function( data ) {
          module.resetView( );
        }
      } );
    },

    loadBugStatus( opts ) {
      // var status = $( "#bstatuser_status input[checked]" ).val( );
      var pmSettings = MC.Settings.read( "processmetrics" );
      var chartType = pmSettings.bstatuser.charttype;

      MC.ajax( {
        url: "/processmetrics/bug_status/per_user",
        params: {
          project: MC.Settings.read( "project" ) || { },
          pmSettings: pmSettings,
        },

        done: function( data ) {
          if( chartType === "trend" ) {
            MC.Charts.createDateLineChart( "#process-bstatuser-chart", data.bstatuser );
          } else if( chartType === "column" ) {
            MC.Charts.createBasicBarChart( "#process-bstatuser-chart", data.bstatuser );
          }

          // $( "#bstatuser_status input[name='openclosed'][value='" + status + "']" )
          //   .attr( "checked", "checked" );

          // $( "#bstatuser_charttype input[name='charttype'][value='" + chartType + "']" )
          //   .attr( "checked", "checked" );
        },

        error: function( data ) {
          module.resetView( );
        }
      } );
    },

    loadComments( opts ) {
      var pmSettings = MC.Settings.read( "processmetrics" );
      var chartType = pmSettings.commentsuser.charttype;

      MC.ajax( {
        url: "/processmetrics/comments_user/per_user",
        params: {
          project: MC.Settings.read( "project" ) || { },
          pmSettings: pmSettings,
        },

        done: function( data ) {
          if( chartType === "trend" ) {
            MC.Charts.createDateLineChart( "#process-commentsuser-chart", data.commentsuser );
          } else if( chartType === "boxplot" ) {

          }
        },

        error: function( data ) {
          module.resetView( );
        }
      } );
    },

    loadBugs( opts ) {
      MC.ajax( {
        url: "/processmetrics/bugs_user/per_user",
        params: {
          project: MC.Settings.read( "project" ) || { },
          pmSettings: MC.Settings.read( "processmetrics" )
        },

        done: function( data ) {
          MC.Charts.createDateLineChart( "#process-bugsuser-chart", data.bugsuser );
        },

        error: function( data ) {
          module.resetView( );
        }
      } );
    },

    loadPatches( opts ) {
      var pmSettings = MC.Settings.read( "processmetrics" );

      MC.ajax( {
        url: "/processmetrics/patches_user/per_user",
        params: {
          project: MC.Settings.read( "project" ) || { },
          pmSettings: pmSettings,
        },

        done: function( data ) {
          MC.Charts.createDateLineChart( "#process-patchesuser-chart", data.patchesuser );
        },

        error: function( data ) {
          module.resetView( );
        }
      } );
    }

  };

  return module;

})(jQuery);
