var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var config = require('../../config/config');
var hbs = require('hbs');
var Util = require('../../helpers/util');
var Commit = require('../../models/productmetrics/Commit');
var Promise = require('bluebird');

// load the modern build
var _ = require('lodash');

var db = require( '../../db/db' );
var queries = require( '../../db/queries' );

router.get('/', function(req, res, next) {
  var data = {
    title: 'Product metrics',
    subtitle: 'Charts for the product metrics',
    prodmactive: "active",
    commodule: "active"
  };

  config.UI.load( ).then( function( uiConf ) {
    _.extend( data, uiConf );

    res.render('productmetrics', data );
  } );
});

router.post( '/per_module', function( req, res, next ) {
  // see middleware in routes/index.js
  var uiSettings = req.body.uiSettings;
  var pmSettings = req.body.pmSettings;

  var currentSettings = Util.getCurrentSettings( uiSettings.globalSettings, pmSettings );

  Commit.getCommitsPerModule( currentSettings ).then( commits => {
    res.status( 200 ).send(
      {
        success: true,
        partials: uiSettings.partials,
        globalSettings: uiSettings.globalSettings,
        commodule: commits
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
