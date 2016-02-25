var hbs = require('hbs');

module.exports = {

  getPartialByName: function(name, data, options) {
    var template = hbs.handlebars.partials[name];

    if(template) {
      if (typeof template !== 'function') {
        template = hbs.handlebars.compile(template);
      }

      return template(data, options);
    }
  },

  checkGlobalSettings: function( globalSettings ) {

  }

};