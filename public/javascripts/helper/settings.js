window.MC = window.MC || {};

window.MC.Settings = (function($, _) {

  var module = {

    /**
      key: "project.dictionary.id" or just "project"
      value: object, array, primitive
    */
    write: function( key, value ) {
      var keyPath = key.split( '.' );

      var newKey = keyPath[ 0 ];
      var obj = MC.storage.getObj( newKey ) || {};

      if( keyPath.length > 1 ) {
        _.set( obj, keyPath.slice(1), value );
      } else {
        obj = value;
      }

      MC.storage.setObj( newKey, obj );
      // module.setCookie( newKey, JSON.stringify( obj ) );

      return obj;
    },


    read: function( key ) {
      var obj = {};

      if( MC.storage ) obj = MC.storage.getObj( key );

      return obj;// || module.getCookie( key );
    },

    setCookie: function( cname, cvalue, exdays ) {
      exdays = exdays || 1;
      var d = new Date();
      d.setTime( d.getTime() + (exdays * 24 * 60 * 60 * 1000) );

      var expires = "expires=" + d.toUTCString();
      var path = "";//"path=" + document.location.pathname;

      document.cookie = cname + "=" + cvalue + "; " + expires + "; " + path;
    },

    getCookie: function( cname ) {
      var name = cname + "=";
      var ca = document.cookie.split(';');

      for( var i=0; i<ca.length; i++ ) {
        var c = ca[i];
        while( c.charAt(0) == ' ') c = c.substring(1);

        if( c.indexOf(name) == 0 ) {
          var val = c.substring( name.length, c.length );
          var ret;

          try {
            ret = JSON.parse( val );
          } catch( err ) {
            ret = val;
          }

          return ret;
        }
      }

      return "";
    },

    // checkCookie: function() {
    //   var user = getCookie("username");
    //   if (user != "") {
    //       alert("Welcome again " + user);
    //   } else {
    //       user = prompt("Please enter your name:", "");
    //       if (user != "" && user != null) {
    //           setCookie("username", user, 365);
    //       }
    //   }
    // },

    changed: function( pathname, key, value, additional, doneFn ) {
      additional = additional || { };

      module.write( key, value );

      _.each( additional, function( val, key ) {
        module.write( key, val );
      } );

      MC.ajax( {
        url: "/settings/changed",
        params: {
          pathname: pathname,
          key: key,
          value: value,
          additional: additional
        },

        done: function( data ) {
          $("#globalSettings-panel").html( data.partial );
          MC.registerSettingsEvents( );

          if( typeof doneFn === 'function' ) {
            doneFn( data );
          }
          window.location.reload(true);
        }
      } );
    },

    load: function( ) {
      var project = MC.storage.getObj( "project" );

      if( project ) {
        var projectId = project.id || -1;
        $( "#projects" ).children( "[value='" + projectId + "']" ).attr( "selected", true );

        if( project.dictionary ) {
          var dictId = project.dictionary.id || -1;
          $( "#dictionaries" ).children( "[value='" + dictId + "']" ).attr( "selected", true );
        }

        // if( project.user ) {
        //   var userId = project.user.id || -1;
        //   $( "#users" ).children( "[value='" + userId + "']" ).attr( "selected", true );
        // }

        if( project.years ) {
          var year = project.year || -1;
          $( "#years" ).children( "[value='" + year + "']" ).attr( "selected", true );
        }
      }
    },

    storeDictionaries: function( data ) {
      if( data.globalSettings && data.globalSettings.project ) {
        if( data.globalSettings.project.dictionaries ) {
          module.write( "project.dictionaries", data.globalSettings.project.dictionaries );
          // MC.Overview.renderOverview( data.globalSettings.project.id );
        }
      }
    },

    storeUsers: function( data ) {
      if( data.globalSettings && data.globalSettings.project && data.globalSettings.project.users ) {
        module.write( "project.users", data.globalSettings.project.users );
        // MC.Overview.renderOverview( data.globalSettings.project.id );
      }
    },

    storeYears: function( data ) {
      if( data.globalSettings && data.globalSettings.project && data.globalSettings.project.years ) {
        module.write( "project.years", data.globalSettings.project.years );
      }
    }

  };

  return module;

})(jQuery, _);