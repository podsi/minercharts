var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

// load the modern build
var _ = require('lodash');

// hbs --> handlebars for template engine
var hbs = require('hbs');

var fs    = require('fs'),
    nconf = require('nconf');
var config = require('./config/config');

var routes = require('./routes');

var app = express();

// configuration
nconf.env().argv();

//
// Values in `settings.json`
//
nconf.file( 'ui', config.DEFAULTS.uiSettingsPath );

hbs.registerPartials(__dirname + config.DEFAULTS.partialsDir);
require("./helpers/hbs_helpers").register(hbs.handlebars);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/vendor', express.static(path.join(__dirname, '/vendor')));
app.use('/node_modules', express.static(path.join(__dirname, '/node_modules')));
app.use('/helpers', express.static(path.join(__dirname, '/helpers')));

app.use( routes );

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
