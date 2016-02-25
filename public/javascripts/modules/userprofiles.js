window.MC = window.MC || {};

window.MC.Userprofiles = (function( $ ) {

  var module = {
    init: function( ) {
      MC.Settings.write( "currentView", { nav: "userprofiles" } );

      module.render( );
    },

    render: function( ) {
      MC.ajax( {
        url: "/userprofiles/load",
        params: {
          project: MC.Settings.read( "project" ) || { }
        },

        done: function( data ) {
          $( "#globalSettings-panel" ).html( data.partial );
          MC.registerSettingsEvents( );
        }
      } );
    },

    resetView: function( ) {
    }
  };

  return module;

})(jQuery);
