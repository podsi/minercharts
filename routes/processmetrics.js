var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var config = require('../config/config');

// load the modern build
var _ = require('lodash');


/* GET users listing. */
router.get('/', function(req, res, next) {
  var data = {
    title: 'Process metrics',
    subtitle: 'Charts for the process metrics',
    procmactive: "active"
  };

  _.extend( data, config.UI );

  res.render('processmetrics', data );
});

module.exports = router;
