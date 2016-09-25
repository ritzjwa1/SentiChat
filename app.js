var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

var AWS = require('aws-sdk');

var fs = require('fs');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);


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

var isEmpty = function(obj) {
  return Object.keys(obj).length === 0;
}

module.exports = app;


//---------------------------------------------

//get the private access keys
var fileContents = fs.readFileSync('../rootkey.csv');
var lines = fileContents.toString().split('\r\n');
var i=0;
var keys=[];
for(i=0; i<lines.length;i++) {
  keys.push(lines[i].split("=")[1]);
}

AWS.config.update({accessKeyId: keys[0], secretAccessKey: keys[1]});
AWS.config.update({region: 'us-west-2'});
var db = new AWS.DynamoDB();
var docClient = new AWS.DynamoDB.DocumentClient();

/////////////////////////////////////////

var users=["user2", "user1"];
users.sort();
var uniqueID=users[0]+"_"+users[1];

var namespace='defaultPrivate1';

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

db.listTables(function(err, data) {
  console.log(data.TableNames);
});

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

var params = {
  TableName:'Sockets',
  Key: {'combinedUserId' : uniqueID}
};  

//console.log(docClient);
//console.log(db);

docClient.get(params, function(err, data) {
  console.log(err);
  console.log(data);
  if (err || isEmpty(data)) {
        console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        var params = {
          TableName:'Sockets',
          Item: {
            'combinedUserId' : uniqueID,
            'socketID' : namespace 
          }
        };
        docClient.put(params, function(err, data) {
          if (err) {
              console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
          } else {
              console.log("Added item:", JSON.stringify(data, null, 2));
          }
      });
    } else {
        console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
    }
});

io.on('connection', function(socket){
  socket.on(namespace, function(msg){
    io.emit(namespace, msg);
    console.log(msg);
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
