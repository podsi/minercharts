window.MC = window.MC || {};

window.MC.Settings = (function($, _) {

  var module = {

    changed: function( pathname, key, value ) {
      MC.ajax( {
        url: "/settings/changed",
        params: {
          pathname: pathname,
          key: key,
          value: value
        },

        done: function( data ) {
        }
      } );
    }
  };

  return module;

})(jQuery, _);