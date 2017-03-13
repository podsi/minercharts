window.MC = window.MC || {};

window.MC.Sentiments = (function( $ ) {

  var module = {
    currentView: { nav: "sentiments" },
    storagePath: "",

    init( ) {
      var active = $( "#sentiments-tabs > li.active" ).
        children( "a" ).first( ).attr( "aria-controls");

      module.currentView.tab = active;
      MC.Settings.write( "currentView", module.currentView );

      module.storagePath = module.currentView.nav + "." + module.currentView.tab;

      module.render( );
    },

    render( ) {
      var project = MC.Settings.read( "project" ) || { };

      MC.ajax( {
        url: "/sentiments/load",
        params: {
          project: project
        },

        done: function( data ) {
          $( "#sentiments-panel" ).html( data.partials.pmBody );

          module.renderUsers( data );
          module.renderFilters( data );
          module.renderCats( data );
          module.loadViewSettings( );

          module.registerUserChangedEvent( );
          module.registerFilterChangedEvents( );
          module.registerCatChangedEvent( );
          module.registerEvents( );

          module.loadChart( data );
        }
      } );
    },

    renderUsers( data ) {
      $( "#" + module.currentView.tab + "_users" ).html( data.partials.users );
    },

    renderFilters( data ) {
      if( module.currentView.tab === "bugcommentsentiment" ) {
        $( "#" + module.currentView.tab + "_priority" ).html( data.partials.priorities );
        $( "#" + module.currentView.tab + "_severity" ).html( data.partials.severities );
        $( "#" + module.currentView.tab + "_resolution" ).html( data.partials.resolutions );
        $( "#" + module.currentView.tab + "_opsys" ).html( data.partials.opsys );
        $( "#" + module.currentView.tab + "_platform" ).html( data.partials.platforms );
        $( "#" + module.currentView.tab + "_version" ).html( data.partials.versions );
      }
    },

    renderCats( data ) {
      if( module.currentView.tab === "bugcommentsentiment" ) {
        $( "#" + module.currentView.tab + "_categories" ).html( data.partials.cats );
      }
    },

    registerUserChangedEvent( ) {
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

    registerCatChangedEvent( ) {
      $( "#" + module.currentView.tab + "_categories select[name='categories']" ).on( "change", function( evt ) {
        module.setCatData( );
        module.loadChart( );
      } );
    },

    // ES6 Syntax
    registerEvents( ) {
      // for comsentiment
      $( "#comsentiment_sentiment input" ).on( "change", function( ) {
        MC.Util.toggleRadio( this.el, $(this).val( ) );

        MC.Settings.write( module.storagePath + ".sentiment", $(this).val( ) );
        module.loadChart( );
      } );

      $( "#bugcommentsentiment_sentiment input" ).on( "change", function( ) {
        MC.Util.toggleRadio( this.el, $(this).val( ) );

        MC.Settings.write( module.storagePath + ".sentiment", $(this).val( ) );
        module.loadChart( );
      } );

      $( "#comsentiment_attribute input" ).on( "change", function( ) {
        MC.Util.toggleRadio( this.el, $(this).val( ) );

        MC.Settings.write( module.storagePath + ".attribute", $(this).val( ) );
        module.loadChart( );
      } );

      $( "#" + module.currentView.tab + "_charttype input" ).on( "change", function( ) {
        MC.Util.toggleRadio( this.el, $(this).val( ) );

        MC.Settings.write( module.storagePath + ".charttype", $(this).val( ) );
        module.loadChart( );
      } );
    },

    resetView( ) {
      $( "#" + module.currentView.tab + "-chart" ).html( "<p><i>No data found</i></p>" );
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

    setCatData( ) {
      var selector = "#" + module.currentView.tab + "_categories select[name='categories']";
      var cat = $( selector ).val( );
      var cname = $( selector ).find(":selected").text( );

      MC.Settings.write( module.storagePath + ".category.id", cat );
      MC.Settings.write( module.storagePath + ".category.name", cname );
    },

    loadViewSettings( ) {
      var nav = module.currentView.nav;
      var tab = module.currentView.tab;

      var storagePath = nav + "." + tab;
      var smSettings = MC.Settings.read( nav );
      var userSelector = "#" + tab + "_users select[name='users']";

      var chartType = "boxplot";
      if( smSettings && smSettings[ tab ] ) {
        if( smSettings[ tab ].charttype ) {
          chartType = smSettings[ tab ].charttype;

          MC.Util.toggleRadio( "#" + tab + "_charttype input", chartType );
          MC.Settings.write( storagePath + ".charttype", chartType );
        }
        
        if( smSettings[ tab ].filter ) {
          const filters = [ 'priority', 'severity', 'resolution', 'opsys', 'platform', 'version' ];

          filters.forEach( function(f) {
            const selector = "#" + module.currentView.tab + "_" + f + " select[name='" + f + "']";
            $( selector ).val( smSettings[ tab ].filter[ f ] || "-1" );
          }.bind( this ) );
        }
      }

      module.setUserData( );
    },

    loadChart( data ) {
      var tab = module.currentView.tab;

      if( tab === "comsentiment" ) module.loadSentimentsPerCommit( );
      else if( tab === "bugcommentsentiment" ) module.loadSentimentsPerBugComment();
    },

    loadSentimentsPerCommit( opts ) {
      MC.ajax( {
        url: "/sentiments/commit_sentiment/per_commit",
        params: {
          project: MC.Settings.read( "project" ) || { },
          smSettings: MC.Settings.read( "sentiments" )
        },

        done: function( data ) {
          MC.Charts.createBoxPlotChart( "#comsentiment-chart", data.comsentiment );
        },

        error: function( data ) {
          module.resetView( );
        }
      } );
    },

    loadSentimentsPerBugComment( opts ) {
      MC.ajax( {
        url: "/sentiments/bug_comment_sentiment/per_bug_comment",
        params: {
          project: MC.Settings.read( "project" ) || { },
          smSettings: MC.Settings.read( "sentiments" )
        },

        done: function( data ) {
          MC.Charts.createDateLineChart( "#bugcommentsentiment-chart", data.bugcommentsentiment );
        },

        error: function( data ) {
          module.resetView( );
        }
      } );
    }
  };

  return module;

})(jQuery);
