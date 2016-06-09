window.MC = window.MC || {};

window.MC.Userprofiles = (function( $ ) {

  var module = {
    currentView: { nav: "userprofiles" },

    init( ) {
      var active = $( "#userprofiles-tabs > li.active" ).
        children( "a" ).first( ).attr( "aria-controls");

      module.currentView.tab = active;
      MC.Settings.write( "currentView", module.currentView );

      module.render( );
    },

    render( ) {
      var project = MC.Settings.read( "project" ) || { };

      MC.ajax( {
        url: "/userprofiles/load",
        params: {
          project: project
        },

        done: function( data ) {
          $( "#userprofiles-panel" ).html( data.partials.pmBody );

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
    },

    resetView( ) {
      $( "#userprofiles-" + module.currentView.tab + "-chart" ).html( "<p><i>No data found</i></p>" );
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
      module.setUserData( );
    },

    loadChart( data ) {
      var tab = module.currentView.tab;

      if( tab === "commits" ) module.loadCommits( );
      else if( tab === "bugs" ) module.loadBugs( );
      // else if( tab === "comsentiment" ) module.loadSentimentsPerCommit( );
    },

    loadCommits( opts ) {
      MC.ajax( {
        url: "/userprofiles/commits/get",
        params: {
          project: MC.Settings.read( "project" ) || { },
          pmSettings: MC.Settings.read( "userprofiles" )
        },

        done: function( data ) {
          MC.Charts.createPieChart( "#userprofiles-commits-chart", data.commits );
        },

        error: function( data ) {
          module.resetView( );
        }
      } );
    },

    loadBugs( opts ) {
      MC.ajax( {
        url: "/userprofiles/bugs/get",
        params: {
          project: MC.Settings.read( "project" ) || { },
          pmSettings: MC.Settings.read( "userprofiles" )
        },

        done: function( data ) {
          MC.Charts.createPieChart( "#userprofiles-bugs-chart", data.bugs );
        },

        error: function( data ) {
          module.resetView( );
        }
      } );
    }
  };

  return module;

})(jQuery);
