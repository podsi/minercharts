var hbs = require('hbs');

module.exports = {

  getCurrentSettings( globalSettings, pmSettings ) {
    var currentSettings = {
      project: globalSettings.project,
      pid: null,
      dict: null,
      uid: pmSettings[ globalSettings.currentView.tab ].user.id,
      uname: pmSettings[ globalSettings.currentView.tab ].user.name,
      year: "all",
      pmSettings: pmSettings[ globalSettings.currentView.tab ]
    };

    if( globalSettings.project && globalSettings.project.id ) {
      pid = globalSettings.project.id;

      currentSettings.pid = pid;

      if( globalSettings.project.dictionary ) {
        var dict = globalSettings.project.dictionary.id || "-1";
        dict = dict < 0 ? null : dict;

        currentSettings.dict = dict;
      }

      if( globalSettings.project.year ) {
        var year = globalSettings.project.year || "all";
        year = year < 0 ? null : year;

        currentSettings.year = year;
      }

      if( globalSettings.project.user ) {
        var uid = globalSettings.project.user.id || "-1";
        uid = uid < 0 ? null : uid;

        currentSettings.uid = uid;

        var uname = globalSettings.project.user.name || "";

        currentSettings.uname = uname;
      }

      return currentSettings;
    } else {
      return null;
    }
  },

  getPartialByName(name, data, options) {
    var template = hbs.handlebars.partials[name];

    if(template) {
      if (typeof template !== 'function') {
        template = hbs.handlebars.compile(template);
      }

      return template(data, options);
    }
  },

  checkGlobalSettings( globalSettings ) {

  }

};