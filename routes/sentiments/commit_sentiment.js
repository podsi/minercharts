var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var config = require('../../config/config');
var hbs = require('hbs');
var Util = require('../../helpers/util');
var Sentiment = require('../../models/sentiments/Sentiment');
var Promise = require('bluebird');

// load the modern build
var _ = require('lodash');

var db = require( '../../db/db' );
var queries = require( '../../db/queries' );

/* GET users listing. */
router.get('/', function(req, res, next) {
  var data = {
    title: 'Sentiments',
    subtitle: 'Charts for the sentiments',
    smactive: "active",
    globalchooseuser: "hidden",
    comsentiment: "active"
  };

  config.UI.load( ).then( function( uiConf ) {
    _.extend( data, uiConf );

    res.render('sentiments', data );
  } );
});

router.post( '/per_commit', function( req, res, next ) {
  // see middleware in routes/index.js
  var uiSettings = req.body.uiSettings;
  var smSettings = req.body.smSettings;

  var currentSettings = Util.getCurrentSettings( uiSettings.globalSettings, smSettings );

  Sentiment.getSentimentsPerCommit( currentSettings ).then( spc => {
    res.status( 200 ).send(
      {
        success: true,
        partials: uiSettings.partials,
        globalSettings: uiSettings.globalSettings,
        comsentiment: spc
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
