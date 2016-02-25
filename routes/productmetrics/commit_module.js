var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var config = require('../../config/config');
var hbs = require('hbs');
var Util = require('../../helpers/util');
var Promise = require('bluebird');

// load the modern build
var _ = require('lodash');

var db = require( '../../db/db' );
var queries = require( '../../db/queries' );

/* GET users listing. */
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

module.exports = router;
