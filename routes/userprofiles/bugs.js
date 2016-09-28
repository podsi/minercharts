var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var config = require('../../config/config');
var hbs = require('hbs');
var Util = require('../../helpers/util');
var Bug = require('../../models/processmetrics/Bug');
var Promise = require('bluebird');

// load the modern build
var _ = require('lodash');

var db = require( '../../db/db' );
var queries = require( '../../db/queries' );

router.get('/', function(req, res, next) {
  var data = {
    title: 'User profile',
    subtitle: 'Charts for user',
    upactive: "active",
    globalchooseuser: "show",
    bugs: "active"
  };

  config.UI.load( ).then( function( uiConf ) {
    _.extend( data, uiConf );

    res.render('userprofiles', data );
  } );
});

/*
  Bugs per user
 */
router.post( '/get', function( req, res, next ) {
  // see middleware in routes/index.js
  var uiSettings = req.body.uiSettings;
  var upSettings = req.body.upSettings;

  var currentSettings = Util.getCurrentSettings( uiSettings.globalSettings, upSettings );

  Bug.getBugcatsPerAuthor( currentSettings, 1 ).then( cats => {
    res.status( 200 ).send(
      {
        success: true,
        partials: uiSettings.partials,
        globalSettings: uiSettings.globalSettings,
        bugs: cats
      }
    );

  }, reason => {
    var html = Util.getPartialByName( "info", { message: reason } );

    res.status( 200 ).send( {
      success: false,
      partials: uiSettings.partials,
      globalSettings: uiSettings.globalSettings,
      message: html
    } );
  } );

});

module.exports = router;
