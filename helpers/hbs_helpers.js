var register = function(Handlebars) {

  var helpers = {
    // put all of your helpers inside this object

    // this function is used to set the selection of the settings dropdowns
    selected: function( curSelection, id ) {
      if( curSelection && id ) {
        return parseInt( curSelection.id, 10 ) === parseInt( id, 10 ) ? ' selected' : '';
      }

      return '';
    }
  };

  if (Handlebars && typeof Handlebars.registerHelper === "function") {
    // register helpers
    for (var prop in helpers) {
      Handlebars.registerHelper(prop, helpers[prop]);
    }
  } else {
    // just return helpers object if we can't register helpers here
    return helpers;
  }

};

module.exports.register = register;
module.exports.helpers = register(null);

