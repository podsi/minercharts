var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('userprofiles', { title: 'User Profiles', subtitle: 'Charts for the user profiles' });
});

module.exports = router;
