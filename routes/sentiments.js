var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('sentiments', { title: 'Sentiments', subtitle: 'Charts for the sentiments' });
});

module.exports = router;
