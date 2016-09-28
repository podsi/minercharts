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
      var userprofiles = MC.Settings.read( "userprofiles" );

      MC.ajax( {
        url: "/userprofiles/load",
        params: {
          project: project,
          userprofiles: userprofiles
        },

        done: function( data ) {
          $( "#userprofiles-panel" ).html( data.partials.pmBody );

          if( data.message ) {
            $( "#userprofiles-commits-chart" ).html( data.message );
          }

          module.renderUsers( data );
          // module.loadViewSettings( );

          module.registerUserChangedEvents( );
          // module.registerEvents( );

          module.loadChart( data );
        }
      } );
    },

    renderUsers( data ) {
      var nav = module.currentView.nav;
      var tab = module.currentView.tab;

      var userSelector = "#global-settings-user select[name='users']";
      var upSettings = MC.Settings.read( nav );

      if( upSettings && upSettings[ tab ] && upSettings.user ) {
        upSettings[ tab ].user = upSettings.user;
      }

      if( upSettings && upSettings[ tab ]
        && upSettings[ tab ].user ) {
        $( userSelector ).val( upSettings[ module.currentView.tab ].user.id );
      }

      module.setUserData( );
    },

    registerUserChangedEvents( ) {
      $( "#global-settings-user select[name='users']" ).on( "change", function( evt ) {
        var context = $(this).find(":selected").attr( "dict-context" );

        module.setUserData( );

        // activate this line to get a filtered dictionary list,
        // it gets filtered by the context of the chosen user
        // e.g. "Max Muster (src)" --> the context here is 'src'
        // module.filterDicts( context );

        // module.activateTab( context );

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
      var selector = "#global-settings-user select[name='users']";
      var user = $( selector ).val( );
      var uname = $( selector ).find(":selected").text( );
      var user_context = $( selector ).find(":selected").attr( "dict-context" );

      var storagePath = module.currentView.nav;

      MC.Settings.write( storagePath + ".user.id", user );
      MC.Settings.write( storagePath + ".user.name", uname );
      MC.Settings.write( storagePath + ".user.context", user_context );

      MC.Settings.write( storagePath + "." + module.currentView.tab + ".user.id", user );
      MC.Settings.write( storagePath + "." + module.currentView.tab + ".user.name", uname );
    },

    // setUserData( ) {
    //   var selector = "#" + module.currentView.tab + "_users select[name='users']";
    //   var user = $( selector ).val( );
    //   var uname = $( selector ).find(":selected").text( );

    //   var storagePath = module.currentView.nav + "." + module.currentView.tab;

    //   MC.Settings.write( storagePath + ".user.id", user );
    //   MC.Settings.write( storagePath + ".user.name", uname );
    // },

    loadViewSettings( ) {

    },

    // activateTab( context ) {
    //   debugger;
    //   if( context === "src" ) {
    //     module.currentView.tab = "commits";
    //     MC.Settings.write( "currentView", module.currentView );

    //     $( "#userprofiles-tabs > li[name='commits'] > a" ).trigger( 'click' );
    //   } else if( context === "bug" ) {
    //     module.currentView.tab = "bugs";
    //     MC.Settings.write( "currentView", module.currentView );

    //     $( "#userprofiles-tabs > li[name='bugs'] > a" ).trigger( 'click' );
    //   }
    // },

    filterDicts( context ) {
      var filteredDicts = $( "#dictionaries" ).children( ).not( "option:contains('(" + context + ")')" );

      $( filteredDicts ).hide( );
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
          upSettings: MC.Settings.read( "userprofiles" )
        },

        done: function( data ) {
          MC.Charts.createPieChart( "#userprofiles-commits-chart", data.commits );
        },

        error: function( data ) {
          // module.resetView( );
        }
      } );
    },

    loadBugs( opts ) {
      MC.ajax( {
        url: "/userprofiles/bugs/get",
        params: {
          project: MC.Settings.read( "project" ) || { },
          upSettings: MC.Settings.read( "userprofiles" )
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
