var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('processmetrics', { title: 'Process metrics', subtitle: 'Charts for the process metrics' });
});

module.exports = router;
