var MC = MC || {};

/**
 * Minercharts entry point
 */
var app = (function($) {

  var module = {

    start: function( ) {
      module.registerSettingsEvents( );
    },

    registerSettingsEvents: function( ) {
      $( "#projects" ).on( "change", function( evt ) {
        var projectId = $(this).val( );
        var pathname = window.location.pathname;

        MC.Settings.changed( pathname, "project.id", projectId );
      } );

      $( "#dictionaries" ).on( "change", function( evt ) {
        var dictId = $(this).val( );
        var dictContext = $(this).children( "[value='" + dictId + "']" ).attr( "dict-context" );
        var pathname = window.location.pathname;

        console.log( dictContext );

        MC.Settings.changed( pathname, "project.dictionary.id", dictId, {
          "project.dictionary.context": dictContext
        } );
      } );

      $( "#users" ).on( "change", function( evt ) {
        var uid = $(this).val( );
        var pathname = window.location.pathname;

        MC.Settings.changed( pathname, "project.user.id", uid );
      } );
    },

    ajax: function( options ) {
      options.method = options.method || "POST";

      jQuery.ajax( {
        url: options.url,
        data: JSON.stringify( options.params ),
        contentType: 'application/json',
        type: options.method,
        dataType: 'json',
        beforeSend: function( ) {
        },

        statusCode: {
          204: function( ) {
            console.log( "No content found" );
          },
          401: function( ) {
            console.log( "Unauthorized" );
          },
          404: function( ) {
            console.log( "Page not found" );
          }
        }
      } )

      .done(function ( data ) {
        if( typeof( options.done ) === 'function' ) {
          options.done( data );
        }
      } )

      .fail(function( xhr ) {
        var data = {};

        try {
          data = JSON.parse( xhr.responseText );
        } catch( e ) {
          data = {};
        }

        var msg = data.message || "Internal Server Error!";

        console.log( msg );
      } );
    }
  };

  return module;

})(jQuery);

_.assign(MC, app);
