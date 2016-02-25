Storage.prototype.setObj = function(key, obj) {
  return MC.storage.setItem(key, JSON.stringify(obj))
};

Storage.prototype.getObj = function(key) {
  return JSON.parse(MC.storage.getItem(key))
};

var MC = MC || {};

/**
 * Minercharts entry point
 */
var app = (function($) {

  var module = {

    storage: sessionStorage,
    // storage: localStorage,

    start: function( ) {
      module.registerSettingsEvents( );
      module.registerNavTabClicks( );
    },

    registerSettingsEvents: function( ) {
      $( "#projects" ).on( "change", function( evt ) {
        var projectId = $(this).val( );
        var pathname = window.location.pathname;

        if( parseInt( projectId, 10 ) > 0 ) {
          MC.Settings.changed( pathname, "project.id", projectId, { }, MC.Settings.storeDictionaries );
        } else {
          MC.storage.removeItem( "project" );
          // document.cookie = "project=;expires=Thu, 01 Jan 1970 00:00:00 UTC";
          window.location.reload( true );
        }

      } );

      $( "#dictionaries" ).on( "change", function( evt ) {
        var dictId = $(this).val( );
        var dictContext = $(this).children( "[value='" + dictId + "']" ).attr( "dict-context" );
        var pathname = window.location.pathname;

        if( parseInt( dictId, 10 ) > 0 ) {
          MC.Settings.changed( pathname, "project.dictionary.id", dictId, {
            "project.dictionary.context": dictContext
          }, MC.Settings.storeYears );
        } else {
          var projectSettings = MC.Settings.write( "project.dictionary.id", dictId );
          projectSettings.dictionary.context = "all";
          delete projectSettings.users;

          MC.Settings.write( "project", projectSettings );
          window.location.reload( true );
        }
      } );

      // $( "#users" ).on( "change", function( evt ) {
      //   var uid = $(this).val( );
      //   var uname = $(this).find(":selected").text( );
      //   var pathname = window.location.pathname;

      //   MC.Settings.write( "project.user.name", uname );
      //   MC.Settings.changed( pathname, "project.user.id", uid );
      // } );

      $( "#years" ).on( "change", function( evt ) {
        var year = $(this).val( );
        var pathname = window.location.pathname;

        MC.Settings.changed( pathname, "project.year", year, { } );
      } );

      $('#warning-alert').on('closed.bs.alert', function () {
        $(this).hide( );
      });
    },

    registerNavTabClicks: function( ) {
      // $( ".nav-link" ).on( 'click', function( e ) {

      //   MC.ajax( {
      //     method: "GET",
      //     url: "/" + $(this).attr( "nav-tab" )
      //   } );
      // } );
    },

    ajax: function( options ) {
      $( "#message" ).empty( );

      options.method = options.method || "POST";
      options.params = options.params || { };

      var post = options.method == "POST";

      _.extend( options.params, { project: MC.Settings.read( "project" ) || { } } );
      _.extend( options.params, { currentView: MC.Settings.read( "currentView" ) || { } } );

      jQuery.ajax( {
        url: options.url,
        data: post ? JSON.stringify( options.params ) : options.params,
        contentType: post ? 'application/json' : "application/x-www-form-urlencoded",
        type: options.method,
        dataType: post ? 'json' : 'text',
        beforeSend: function( ) {
          $("#warning-alert").empty( );
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
        if( !post ) {
          $( "body" ).html( data );
          MC.registerSettingsEvents( );
        } else {
          if( data.partials && data.partials.globalSettings ) {
            $( "#globalSettings-panel" ).html( data.partials.globalSettings );
            MC.registerSettingsEvents( );
          }

          if( data.success === false ) {

            // success false
            if( options.error ) {
              options.error( data );
            }

            module.notify( data );
          } else {
            if( typeof( options.done ) === 'function' ) {
              options.done( data );
            }
          }
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
    },

    notify: function( data ) {
      var msg = data.message || "Please contact the administrator!";
      var type = data.type || 'info';

      $('#message').html( msg );
    },
  };

  return module;

})(jQuery);

_.assign(MC, app);
