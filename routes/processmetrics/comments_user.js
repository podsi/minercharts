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

/* GET users listing. */
router.get('/', function(req, res, next) {
  var data = {
    title: 'Process metrics',
    subtitle: 'Charts for the process metrics',
    procmactive: "active",
    globalchooseuser: "hidden",
    commentsuser: "active"
  };

  console.log( data );

  config.UI.load( ).then( function( uiConf ) {
    _.extend( data, uiConf );

    res.render('processmetrics', data );
  } );
});

router.post( '/per_user', function( req, res, next ) {
  // see middleware in routes/index.js
  var uiSettings = req.body.uiSettings;
  var pmSettings = req.body.pmSettings;

  var currentSettings = Util.getCurrentSettings( uiSettings.globalSettings, pmSettings );

  Bug.getCommentsPerUser( currentSettings ).then( comments => {
    res.status( 200 ).send(
      {
        success: true,
        partials: uiSettings.partials,
        globalSettings: uiSettings.globalSettings,
        commentsuser: comments
      }
    );

  }, reason => {
    var html = Util.getPartialByName( "info", { message: reason } );

    res.status( 200 ).send( {
      success: false,
      message: html
    } );
  } );
});

module.exports = router;
