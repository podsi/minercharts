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

/* GET users listing. */
router.get('/', function(req, res, next) {
  var data = {
    title: 'User profile',
    subtitle: 'Charts for user',
    upactive: "active",
    globalchooseuser: "show",
    commits: "active"
  };

  db.serialize( function( ) {
    db.all( queries.SELECT_ALL_IDENTITIES, [ ], function( err, users ) {
      if( err ) {
        console.log( err );
        console.log( "ERROR" );
      }

      config.UI.set( { "users": users } ).then( function( settings ) {
        _.extend( data, settings );

        res.render( 'userprofiles', data );
      } );
    } );
  } );

  // config.UI.load( ).then( function( uiConf ) {
  //   _.extend( data, uiConf );

  //   res.render('userprofiles', data );
  // } );
});

/*
  Commits per user
 */
router.post( '/get', function( req, res, next ) {
  // see middleware in routes/index.js
  var uiSettings = req.body.uiSettings;
  var upSettings = req.body.upSettings;

  var currentSettings = Util.getCurrentSettings( uiSettings.globalSettings, upSettings );

  // 1 = chart type --> pie chart
  Commit.getCommitsPerUser( currentSettings, 1 ).then( cats => {
    res.status( 200 ).send(
      {
        success: true,
        partials: uiSettings.partials,
        globalSettings: uiSettings.globalSettings,
        commits: cats
      }
    );

  }, reason => {
    var html = Util.getPartialByName( "info", { message: reason } );

    res.status( 200 ).send( {
      success: false,
      message: html
    } );
  } );

} );

module.exports = router;
