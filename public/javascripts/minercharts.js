var MC = MC || {};

/**
 * Minercharts entry point
 */
var app = (function($) {

  var module = {

    start: function( ) {
      if( MC.Overview ) {
        MC.Overview.init( );
      }
    },

    ajax: function( options ) {
      options.method = options.method || "POST";

      jQuery.ajax( {
        url: options.url,
        data: options.params,
        type: options.method,
        dataType: 'json',
        beforeSend: function( ) {
        },

        success: function ( data ) {
          if( typeof( options.success ) === 'function' ) {
            options.success( data );
          }
        },

        error: function( xhr ) {
          // Session abgelaufen
          if( xhr.status === 401 ) {
            console.log( xhr );
            return;
          }

          var data = {};

          try {
            data = JSON.parse( xhr.responseText );
          } catch( e ) {
            data = {};
          }

          var msg = data.message || "Internal Server Error!";

          console.log( msg );
        }
      } );
    }
  };

  return module;

})(jQuery);

_.assign(MC, app);
