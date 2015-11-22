var express = require('express');
var router = express.Router();

// require all routes (controllers)
var userProfiles = require('./userprofiles');
var sentiments = require('./sentiments');
var processMetrics = require('./processmetrics');
var productMetrics = require('./productmetrics');

// use the required routes
router.use( '/userprofiles', userProfiles );
router.use( '/sentiments', sentiments );
router.use( '/processmetrics', processMetrics );
router.use( '/productmetrics', productMetrics );


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Overview' });
});

module.exports = router;
