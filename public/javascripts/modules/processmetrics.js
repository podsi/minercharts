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
      module.registerEvents( );
    },

    render( ) {
      var project = MC.Settings.read( "project" );

      MC.ajax( {
        url: "/processmetrics/load",
        params: {
          project: project || { }
        },

        done: function( data ) {
          $( "#processmetrics-panel" ).html( data.partials.pmBody );

          module.renderUsers( data );
          module.registerUserChangedEvents( );
          module.loadChart( data );
        }
      } );
    },

    renderUsers( data ) {
      switch( module.currentView.tab ) {
        case "bcatsauthor":
          $( "#bcatsauthor_users" ).html( data.partials.users );
          module.setUserData( );
          break;
      }
    },

    registerUserChangedEvents( ) {
      $( "#bcatsauthor_users #users" ).on( "change", function( evt ) {
        module.setUserData( );
        module.loadBugCats( );
      } );
    },

    // ES6 Syntax
    registerEvents( ) {

    },

    resetView( ) {
      $( "#process-chart" ).html( "<p><i>No data found</i></p>" );
    },

    setUserData( ) {
      var selector = "#" + module.currentView.tab + "_users #users";
      var user = $( selector ).val( );
      var uname = $( selector ).find(":selected").text( );

      var storagePath = module.currentView.nav + "." + module.currentView.tab;

      MC.Settings.write( storagePath + ".user.id", user );
      MC.Settings.write( storagePath + ".user.name", uname );
    },

    loadChart( data ) {
      if( module.currentView.tab === "bcatsauthor" ) module.loadBugCats( );
    },

    loadBugCats( opts ) {
      MC.ajax( {
        url: "/processmetrics/bug_cats/per_author",
        params: {
          project: MC.Settings.read( "project" ) || { },
          pmSettings: MC.Settings.read( "processmetrics" )
        },

        done: function( data ) {
          MC.Charts.createDateLineChart( "#process-chart", data.bcatsauthor );
        },

        error: function( data ) {
          module.resetView( );
        }
      } );
    }
  };

  return module;

})(jQuery);
