var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var config = require('../config/config');

// load the modern build
var _ = require('lodash');

/* POST settings. */
router.post('/changed', function(req, res, next) {
  var pathname = req.body.pathname;
  var key = req.body.key;
  var value = req.body.value;

  if( key === "project.id" && value < 0 ) {
    config.UI.remove( "project" );
    res.status( 404 ).send( { message: "No Project for given id " + value } );
  } else {
    config.UI.set( key, value ).then( function( settings ) {
      res.send( 200 );
    } );
  }
});

module.exports = router;
