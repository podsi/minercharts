var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var config = require('../config/config');
var hbs = require('hbs');
var Promise = require('bluebird');

// load the modern build
var _ = require('lodash');


/* GET users listing. */
router.get('/', function(req, res, next) {
  var data = {
    title: 'User Profiles',
    subtitle: 'Charts for the user profiles',
    upactive: "active"
  };

  config.UI.load( ).then( function( uiConf ) {
    _.extend( data, uiConf );

    res.render('userprofiles', data );
  } );
});

router.post( '/load', function( req, res, next ) {
  // see middleware in routes/index.js
  var uiSettings = req.body.uiSettings;

  res.status( 200 ).send(
    {
      success: true,
      partial: uiSettings.partial,
      settings: uiSettings.globalSettings
    }
  );

} );

module.exports = router;
