window.MC = window.MC || {};

window.MC.Sentiments = (function( $ ) {

  var module = {
    init: function( ) {
      MC.Settings.write( "currentView", { nav: "sentiments" } );

      module.render( );
    },

    render: function( ) {
      MC.ajax( {
        url: "/sentiments/load",
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
