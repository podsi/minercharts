var express = require('express');
var router = express.Router();
var nconf = require('nconf');
var config = require('../config/config');

// load the modern build
var _ = require('lodash');


/* GET users listing. */
router.get('/', function(req, res, next) {
  var data = {
    title: 'User Profiles',
    subtitle: 'Charts for the user profiles',
    upactive: "active"
  };

  _.extend( data, config.UI );

  res.render('userprofiles', data );
});

module.exports = router;
