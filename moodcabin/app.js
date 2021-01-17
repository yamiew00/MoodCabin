var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var adminRouter = require('./routes/admin');
var statRouter = require('./routes/statistic');
var modifyRouter = require('./routes/modify');
var chatRouter = require('./routes/chat');
var notiRouter = require('./routes/notification');

var app = express();

//連MySQL
var mysql = require("mysql");

var con = mysql.createConnection({
  host: "35.201.247.105",
  user: "root",
  password: "nimiew00",
  port: 3306,
});

con.connect(function(err) {
    if (err) {
        console.log('connecting error');
        return;
    }
    console.log('connecting success');
});


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
  req.con = con;
  next();
});
app.use('/', indexRouter);
app.use('/admin', adminRouter);
app.use('/statistic', statRouter);
app.use('/modify', modifyRouter);
app.use('/chat', chatRouter);
app.use('/notification', notiRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});



module.exports = app;
