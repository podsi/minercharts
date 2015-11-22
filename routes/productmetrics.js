var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('productmetrics', { title: 'Product metrics', subtitle: 'Charts for the product metrics' });
});

module.exports = router;
