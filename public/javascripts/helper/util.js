window.MC = window.MC || {};

window.MC.Util = (function($, _) {

  var module = {
    toggleRadio( selector, value ) {
      $( selector ).filter( ':checked' ).removeAttr( "checked" );

      if( value ) {
        selector += "[value='" + value + "']";
      }

      $( selector ).prop( "checked", "checked" );
    }
  };

  return module;

})(jQuery, _);