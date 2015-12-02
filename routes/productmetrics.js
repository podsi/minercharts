var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var config = require('../config/config');

// load the modern build
var _ = require('lodash');


/* GET users listing. */
router.get('/', function(req, res, next) {
  var data = {
    title: 'Product metrics',
    subtitle: 'Charts for the product metrics',
    prodmactive: "active"
  };

  _.extend( data, config.UI );

  res.render('productmetrics', data );
});

module.exports = router;
