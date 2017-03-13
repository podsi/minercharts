window.MC = window.MC || {};

window.MC.Processmetrics = (function( $ ) {

  var module = {
    currentView: { nav: "processmetrics" },
    storagePath: "",

    init( ) {
      var active = $( "#processmetrics-tabs > li.active" ).
        children( "a" ).first( ).attr( "aria-controls");

      module.currentView.tab = active;
      MC.Settings.write( "currentView", module.currentView );

      module.storagePath = module.currentView.nav + "." + module.currentView.tab;

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
          module.renderCategories( data );
          module.renderFilters( data );
          module.loadViewSettings( );

          module.registerUserChangedEvents( );
          module.registerFilterChangedEvents( );
          module.registerEvents( );

          module.loadChart( );
        }
      } );
    },

    renderUsers( data ) {
      $( "#" + module.currentView.tab + "_users" ).html( data.partials.users );
    },

    renderCategories( data ) {
      if( module.currentView.tab === "bcatsauthor" ) {
        $( "#" + module.currentView.tab + "_categories" ).html( data.partials.bcats );
      }
    },

    renderFilters( data ) {
      if( module.currentView.tab === "commentsuser" || module.currentView.tab === "bugsattribute" ) {
        $( "#" + module.currentView.tab + "_priority" ).html( data.partials.priorities );
        $( "#" + module.currentView.tab + "_severity" ).html( data.partials.severities );
        $( "#" + module.currentView.tab + "_resolution" ).html( data.partials.resolutions );
        $( "#" + module.currentView.tab + "_opsys" ).html( data.partials.opsys );
        $( "#" + module.currentView.tab + "_platform" ).html( data.partials.platforms );
        $( "#" + module.currentView.tab + "_version" ).html( data.partials.versions );
      }
    },

    registerUserChangedEvents( ) {
      $( "#" + module.currentView.tab + "_users select[name='users']" ).on( "change", function( evt ) {
        module.setUserData( );
        module.loadChart( );
      } );
    },

    registerFilterChangedEvents( ) {
      const filters = [ 'priority', 'severity', 'resolution', 'opsys', 'platform', 'version' ];

      filters.forEach( module.registerFilterChangedEvent.bind( this ) );
    },

    registerFilterChangedEvent( filter ) {
      const selector = "#" + module.currentView.tab + "_" + filter + " select[name='" + filter + "']";

      $( selector ).on( "change", function( evt ) {
        module.setFilterData( filter, selector );
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

      $( "#" + module.currentView.tab + "_charttype input" ).on( "change", function( ) {
        MC.Util.toggleRadio( this.el, $(this).val( ) );

        MC.Settings.write( module.storagePath + ".charttype", $(this).val( ) );

        if( module.currentView.tab === "bstatuser" ) {
          module.loadBugStatus( );
        } else if( module.currentView.tab === "commentsuser" ) {
          module.loadComments( );
        }
      } );
    },

    resetView( ) {
      $( "#process-" + module.currentView.tab + "-chart" ).html( "<p><i>No data found</i></p>" );
    },

    setUserData( ) {
      var selector = "#" + module.currentView.tab + "_users select[name='users']";
      var user = $( selector ).val( );
      var uname = $( selector ).find(":selected").text( );

      MC.Settings.write( module.storagePath + ".user.id", user );
      MC.Settings.write( module.storagePath + ".user.name", uname );
    },

    setFilterData( filter, selector ) {
      var val = $( selector ).val( );
      MC.Settings.write( module.storagePath + ".filter." + filter, val );
    },

    loadViewSettings( ) {
      var nav = module.currentView.nav;
      var tab = module.currentView.tab;

      var pmSettings = MC.Settings.read( nav );
      var userSelector = "#" + tab + "_users select[name='users']";

      // $( userSelector ).attr( "selected", true );

      if( pmSettings && tab === "bstatuser" && pmSettings.bstatuser ) {
        var openclosed = "both";
        if( pmSettings.bstatuser.openclosed ) {
          openclosed = pmSettings.bstatuser.openclosed;
        }

        MC.Settings.write( module.storagePath + ".openclosed", openclosed );
        MC.Util.toggleRadio( "#bstatuser_status input", openclosed );
      }

      var chartType = "trend";
      if( pmSettings && pmSettings[ tab ] ) {
        if( pmSettings[ tab ].charttype ) {
          chartType = pmSettings[ tab ].charttype;

          MC.Util.toggleRadio( "#" + tab + "_charttype input", chartType );
          MC.Settings.write( module.storagePath + ".charttype", chartType );
        }

        if( pmSettings[ tab ].filter ) {
          const filters = [ 'priority', 'severity', 'resolution', 'opsys', 'platform', 'version' ];

          filters.forEach( function(f) {
            const selector = "#" + module.currentView.tab + "_" + f + " select[name='" + f + "']";
            $( selector ).val( pmSettings[ tab ].filter[ f ] || "-1" );
          }.bind( this ) );
        }
      }

      if( tab === "bstatuser" || tab === "commentsuser" ) {
        MC.Settings.write( module.storagePath + ".charttype", chartType );
        MC.Util.toggleRadio( "#" + tab + "_charttype input", chartType );
      }

      module.setUserData( );
    },

    loadChart( ) {
      var tab = module.currentView.tab;

      if( tab === "bcatsauthor" ) module.loadBugCats( );
      else if( tab === "bstatuser" ) module.loadBugStatus( );
      else if( tab === "commentsuser" ) module.loadComments( );
      else if( tab === "bugsattribute" ) module.loadBugsWithAttributes( );
      else if( tab === "patchesuser" ) module.loadPatches( );
    },

    loadBugCats( opts ) {
      MC.ajax( {
        url: "/processmetrics/bug_severities/per_author",
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
            MC.Charts.createBoxPlotChart( "#process-commentsuser-chart", data.commentsuser );
          }
        },

        error: function( data ) {
          module.resetView( );
        }
      } );
    },

    loadBugsWithAttributes( opts ) {
      MC.ajax( {
        url: "/processmetrics/bugs_attribute/with_attributes",
        params: {
          project: MC.Settings.read( "project" ) || { },
          pmSettings: MC.Settings.read( "processmetrics" )
        },

        done: function( data ) {
          MC.Charts.createDateLineChart( "#process-bugsattribute-chart", data.bugsattribute );
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
          debugger;
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
