var express = require('express');
var socket = require('socket.io');
var bodyParser = require('body-parser')
const Mongodb = require('mongodb');

var app = express();
const MONGODB_URI = 'mongodb://Admin:password123@ds117101.mlab.com:17101/chatroomservice';
var db;

Mongodb.MongoClient.connect(MONGODB_URI, function (err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  db = database.db('chatroomservice');
  console.log("Database connection ready");
});

var server = app.listen(4000,function(){
  console.log("Listening");
});

app.use(bodyParser.urlencoded({
  extended: true
}));

app.post('/signup', function(req, response) {
    var username = req.body.username;
    var password = req.body.password;
    var newProfile = { username: username, password: password };
    var checkExist = {username: username};
    var usernameTaken = false;

    console.log("posted");
    db.collection("userProfiles").find(checkExist).toArray(function(err, res) {
      console.log(res);
      if (err) throw err;
      if(res.length >= 1) usernameTaken = true;
      makeAccount(newProfile,usernameTaken,response);
    });
});

function makeAccount(newProfile,usernameTaken,response){
  if(usernameTaken){
    var obj =  { status : { type: "Bad request", message:"Error username is taken",code:201,error:true} };
    response.writeHead(200, {"Content-Type": "application/json"});
    response.write(JSON.stringify(obj));
    console.log("taken");
    return;
  }
  db.collection("userProfiles").insertOne(newProfile, function(err, res) {
    console.log("here");
    if (err) throw err;
    var obj = { status : { type: "Success", message:"Signup success",code:200,error:false} };;
    response.writeHead(200, {"Content-Type": "application/json"});
    response.write(JSON.stringify(obj));
    console.log("success!");
  });
}

app.post('/login', function(req, response) {
    var username = req.body.username;
    var password = req.body.password;
    var checkProfile = { username: username, password: password };
    db.collection("userProfiles").find(checkProfile).toArray(function(err, res) {
      console.log(res);
      var content , error, sessionToken, type, message, code;
      if (err) throw err;
      content = (res.length == 1) ? "Login success" : "Login failed";
      error = (res.length == 1) ? false : true;
      type = (res.length == 1) ? "Success" : "Unauthorized";
      message = (res.length == 1) ? "Success" : "Authentication Failed: Invalid user credentials";
      code = (res.length == 1) ? 200 : 401;
      sessionToken = (res.length == 1) ? "qwerty1234567890" : "";
      var obj = (res.length == 1) ? { status : { type: type, message:message,code:code,error:error},
      data:{ user: username,status:type, sessionToken: sessionToken}} :  { status : { type: type, message:message,code:code,error:error}};
      response.writeHead(200, {"Content-Type": "application/json"});
      response.write(JSON.stringify(obj));
    });

});

app.get("/chatrooms",function(request, response){
    var obj = { id : "Wow", Content : "content " +"cool" };
    response.writeHead(200, {"Content-Type": "application/json"});
    response.write(JSON.stringify(obj));
});

app.post("/createChatroom",function(request, response){
    var obj = { id : "Wow", Content : "content " +"cool" };
    response.writeHead(200, {"Content-Type": "application/json"});
    response.write(JSON.stringify(obj));
});

//Socket setup
var io = socket(server);
io.on('connection', (socket) => {
  console.log("made socket connection",socket.id);

  socket.on('chat',function(data){
    io.emit('chat',data);
    console.log('sending');
  });

  socket.on('typing', function(data){
        socket.broadcast.emit('typing', data);
    });
});
