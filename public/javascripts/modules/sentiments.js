window.MC = window.MC || {};

window.MC.Sentiments = (function( $ ) {

  var module = {
    currentView: { nav: "sentiments" },

    init( ) {
      var active = $( "#sentiments-tabs > li.active" ).
        children( "a" ).first( ).attr( "aria-controls");

      module.currentView.tab = active;
      MC.Settings.write( "currentView", module.currentView );

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
          module.renderCats( data );
          module.loadViewSettings( );

          module.registerUserChangedEvent( );
          module.registerCatChangedEvent( );
          module.registerEvents( );

          module.loadChart( data );
        }
      } );
    },

    renderUsers( data ) {
      $( "#" + module.currentView.tab + "_users" ).html( data.partials.users );
    },

    renderCats( data ) {
      if( module.currentView.tab === "comsentiment" ) {
        $( "#" + module.currentView.tab + "_categories" ).html( data.partials.cats );
      }
    },

    registerUserChangedEvent( ) {
      $( "#" + module.currentView.tab + "_users select[name='users']" ).on( "change", function( evt ) {
        module.setUserData( );
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
      $( "#comloc_loc input" ).on( "change", function( ) {
        MC.Util.toggleRadio( this.el, $(this).val( ) );

        MC.Settings.write( "productmetrics.comloc.loc", $(this).val( ) );
        module.loadChart( );
      } );

      // for comsentiment
      $( "#comsentiment_sentiment input" ).on( "change", function( ) {
        MC.Util.toggleRadio( this.el, $(this).val( ) );

        MC.Settings.write( "productmetrics.comsentiment.sentiment", $(this).val( ) );
        module.loadChart( );
      } );

      $( "#comsentiment_attribute input" ).on( "change", function( ) {
        MC.Util.toggleRadio( this.el, $(this).val( ) );

        MC.Settings.write( "productmetrics.comsentiment.attribute", $(this).val( ) );
        module.loadChart( );
      } );

      $( "#" + module.currentView.tab + "_charttype input" ).on( "change", function( ) {
        MC.Util.toggleRadio( this.el, $(this).val( ) );

        MC.Settings.write( "productmetrics." + module.currentView.tab + ".charttype", $(this).val( ) );
        module.loadChart( );
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

    setCatData( ) {
      var selector = "#" + module.currentView.tab + "_categories select[name='categories']";
      var cat = $( selector ).val( );
      var cname = $( selector ).find(":selected").text( );

      var storagePath = module.currentView.nav + "." + module.currentView.tab;

      MC.Settings.write( storagePath + ".category.id", cat );
      MC.Settings.write( storagePath + ".category.name", cname );
    },

    loadViewSettings( ) {
      var nav = module.currentView.nav;
      var tab = module.currentView.tab;

      var storagePath = nav + "." + tab;
      var smSettings = MC.Settings.read( nav );
      var userSelector = "#" + tab + "_users select[name='users']";

      var chartType = "trend";
      if( smSettings && smSettings[ tab ]
        && smSettings[ tab ].charttype ) {
        chartType = smSettings[ tab ].charttype;
      }

      if( tab === "comloc" ) {
        MC.Settings.write( storagePath + ".charttype", chartType );
        MC.Util.toggleRadio( "#" + tab + "_charttype input", chartType );
      }

      module.setUserData( );
    },

    loadChart( data ) {
      var tab = module.currentView.tab;

      if( tab === "comsentiment" ) module.loadSentimentsPerCommit( );
    },

    loadSentimentsPerCommit( opts ) {
      MC.ajax( {
        url: "/sentiments/commit_sentiment/per_commit",
        params: {
          project: MC.Settings.read( "project" ) || { },
          smSettings: MC.Settings.read( "sentiments" )
        },

        done: function( data ) {
          MC.Charts.createDateLineChart( "#comsentiment-chart", data.comsentiment );
        },

        error: function( data ) {
          module.resetView( );
        }
      } );
    }

  };

  return module;

})(jQuery);
