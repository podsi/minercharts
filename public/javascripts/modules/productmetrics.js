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
          project: project,
          pmSettings: MC.Settings.read( "productmetrics" )
        },

        done: function( data ) {
          $( "#productmetrics-panel" ).html( data.partials.pmBody );

          module.renderUsers( data );
          module.renderModules( data );
          // module.renderCats( data );
          module.loadViewSettings( );

          module.registerUserChangedEvent( );
          module.registerModuleChangedEvent( );
          // module.registerCatChangedEvent( );
          module.registerEvents( );

          module.loadChart( data );
        }
      } );
    },

    renderUsers( data ) {
      $( "#" + module.currentView.tab + "_users" ).html( data.partials.users );
    },

    renderModules( data ) {
      $( "#" + module.currentView.tab + "_modules" ).html( data.partials.modules );
    },

    renderCats( data ) {
      if( module.currentView.tab === "comsentiment" ) {
        $( "#" + module.currentView.tab + "_categories" ).html( data.partials.cats );
      }
    },

    registerUserChangedEvent( ) {
      $( "#" + module.currentView.tab + "_users select[name='users']" ).on( "change", function( evt ) {
        module.setUserData( );


        var storagePath = module.currentView.nav + "." + module.currentView.tab;
        MC.Settings.write( storagePath + ".module.name", "-1" );

        module.render( );
      } );
    },

    registerModuleChangedEvent( ) {
      $( "#" + module.currentView.tab + "_modules select[name='modules']" ).on( "change", function( evt ) {
        module.setModuleData( );
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

      var chartType = MC.Settings.read( storagePath + ".charttype" );
      var loc = MC.Settings.read( storagePath + ".loc" );

      if( !chartType ) {
        MC.Settings.write( storagePath + ".charttype", "trend" );
      }

      if( !loc ) {
        MC.Settings.write( storagePath + ".loc", "added" );
      }
    },

    setModuleData( ) {
      var selector = "#" + module.currentView.tab + "_modules select[name='modules']";
      var moduleFolder = $( selector ).val( );

      var storagePath = module.currentView.nav + "." + module.currentView.tab;

      MC.Settings.write( storagePath + ".module.name", moduleFolder );
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
      var pmSettings = MC.Settings.read( nav );
      var userSelector = "#" + tab + "_users select[name='users']";

      if( pmSettings && pmSettings[ tab ]
        && pmSettings[ tab ].user ) {
        $( userSelector ).val( pmSettings[ tab ].user.id );

        if( tab === "commodule" && pmSettings[ tab ].module ) {
          var selector = "#" + module.currentView.tab + "_modules select[name='modules']";
          var m = pmSettings[ tab ].module;

          $( selector ).val( m.name || "-1" );
        }
      }

      module.setUserData( );
    },

    loadChart( data ) {
      var tab = module.currentView.tab;

      if( tab === "comuser" ) module.loadCommitsPerUser( );
      else if( tab === "comloc" ) module.loadLoc( );
      else if( tab === "commodule" ) module.loadCommitsPerModule( );
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

    loadCommitsPerModule( opts ) {
      MC.ajax( {
        url: "/productmetrics/commit_module/per_module",
        params: {
          project: MC.Settings.read( "project" ) || { },
          pmSettings: MC.Settings.read( "productmetrics" )
        },

        done: function( data ) {
          MC.Charts.createDateLineChart( "#commodule-chart", data.commodule );
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
