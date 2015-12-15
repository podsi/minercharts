window.MC = window.MC || {};

window.MC.Settings = (function($, _) {

  var module = {

    changed: function( pathname, key, value, additional ) {
      additional = additional || { };

      MC.ajax( {
        url: "/settings/changed",
        params: {
          pathname: pathname,
          key: key,
          value: value,
          additional: additional
        },

        done: function( data ) {
          window.location.reload(true);
        }
      } );
    }

  };

  return module;

})(jQuery, _);