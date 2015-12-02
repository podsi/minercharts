var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var config = require('../config/config');

// load the modern build
var _ = require('lodash');


/* GET users listing. */
router.get('/', function(req, res, next) {
  var data = {
    title: 'Sentiments',
    subtitle: 'Charts for the sentiments',
    smactive: "active"
  };

  _.extend( data, config.UI );

  res.render('sentiments', data );
});

module.exports = router;
