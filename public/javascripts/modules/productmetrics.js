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
      module.registerEvents( );
    },

    render( ) {
      MC.ajax( {
        url: "/productmetrics/load",
        params: {
          project: MC.Settings.read( "project" ) || { }
        },

        done: function( data ) {
          $( "#productmetrics-panel" ).html( data.partials.pmBody );

          module.renderUsers( data );
          module.registerUserChangedEvents( );
          module.loadChart( data );

          // $( "#comuser_years" ).html( data.partials.years );
          // module.registerEvents( );

          // if( data.partials.users ) {
          //   $( "#comuser_users" ).html( data.partials.years );
          //   module.registerEvents( );
          // }
        }
      } );
    },

    renderUsers( data ) {
      switch( module.currentView.tab ) {
        case "comuser":
          $( "#comuser_users" ).html( data.partials.users );
          module.setUserData( );
          break;
      }
    },

    registerUserChangedEvents( ) {
      $( "#comuser_users #users" ).on( "change", function( evt ) {
        module.setUserData( );
        module.loadCommitsPerUser( );
      } );
    },

    // ES6 Syntax
    registerEvents( ) {
      // $( "#comuser_years #years" ).on( "change", function( evt ) {
      //   var year = $( this ).val( );
      //   MC.Settings.write( "productMetrics.comuser.year", year );

      //   module.loadCommitsPerUser( { year: year } );
      // } );
    },

    resetView( ) {
      $( "#comuser-chart" ).html( "<p><i>No data found</i></p>" );
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
      if( module.currentView.tab === "comuser" ) module.loadCommitsPerUser( );
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
    }
  };

  return module;

})(jQuery);
