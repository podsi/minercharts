var express = require('express');
var router = express.Router();

var db = require( '../db/db' );

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
  var project = "1";
  var commitDict = "1";

  var sql = "SELECT "
    + "   Categories.name as category, COUNT(*) as amount "
    + "FROM "
    + "   Commits, CommitCategories, Categories, Dictionary "
    + "WHERE "
    + "   Commits.id=CommitCategories.commitId "
    + "   AND Commits.project = ?"
    + "   AND CommitCategories.category=Categories.id "
    + "   AND Categories.dictionary=Dictionary.id "
    + "   AND Dictionary.project = ? "
    + "   AND Categories.dictionary = ? "
    + "GROUP BY "
    + "   CommitCategories.category"
    + " UNION "
    + "SELECT "
    + "   'uncategorised', (SELECT COUNT(*) "
    + "FROM "
    + "   Commits "
    + "WHERE "
    + "   Commits.project = ?)"
    + " - (SELECT COUNT(*) FROM Commits, CommitCategories WHERE Commits.id = CommitCategories.commitId AND Commits.project = ?)";

  db.all( "SELECT * FROM Users", [], function( err, users ) {
    console.log( users );
  });


  db.serialize( function( ) {
    db.all( sql, [ project, project, commitDict, project, project ], function( err, cats ) {
      if( err ) {
        console.log( "ERROR" );
      }
      console.log( "each" );
      console.log( cats );

      res.render( 'index', { cats: cats } );
    } );
  } );

  // res.render('index', { title: 'Overview' });
});

module.exports = router;
