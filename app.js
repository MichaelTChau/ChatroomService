var express = require('express');
var socket = require('socket.io');
var bodyParser = require('body-parser');
var cors = require('cors');
const Mongodb = require('mongodb');

const MONGODB_URI = 'mongodb://Admin:password123@ds117101.mlab.com:17101/chatroomservice';
var db;
var currentRoom = "";

var app = express();

Mongodb.MongoClient.connect(MONGODB_URI, function (err, database) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  db = database.db('chatroomservice');
  console.log("Database connection ready");
});

var server = app.listen(4000,function(){
  console.log("Listening");
});

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(cors());

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
    response.end();
    console.log("taken");
    return;
  }
  db.collection("userProfiles").insertOne(newProfile, function(err, res) {
    console.log("here");
    if (err) throw err;
    var obj = { status : { type: "Success", message:"Signup success",code:200,error:false} };;
    response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
    response.write(JSON.stringify(obj));
    response.end();
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
      response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
      response.write(JSON.stringify(obj));
      response.end();
    });

});

app.get("/chatrooms",function(request, response){
  db.collection("chatrooms").find().project({ _id: 0, messages:0}).toArray(function(err, res) {
    console.log(res);
    var content , error, sessionToken, type, message, code;
    if (err) throw err;
    error = false;
    type = "Success";
    message ="Chatroom loaded success!";
    code =  200;
    var obj =  { status : { type: type, message:message,code:code,error:error},
    data:{ chatrooms: res}} ;
    response.writeHead(200, {"Content-Type":"application/json; charset=utf-8"});
    response.write(JSON.stringify(obj));
    response.end();
    console.log("sending");
  });
});

app.post("/createChatroom",function(request, response){
    var chatroomName = request.body.chatroomName;
    var roomExist = { chatroomName : chatroomName};
    var roomTaken = false;
    db.collection("chatrooms").find(roomExist).toArray(function(err, res) {
      console.log(res);
      if (err) throw err;
      if(res.length >= 1) roomTaken = true;
      makeRoom(chatroomName,roomTaken,response);
    });
});

function makeRoom(chatroomName,roomTaken,response){
  if(roomTaken){
    var obj =  { status : { type: "Bad request", message:"Error the room exist already",code:201,error:true} };
    response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
    response.write(JSON.stringify(obj));
    response.end();
    return;
  }
  var date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  var newRoom = {chatroomName:chatroomName,dateCreated:date, messages:[]};
  db.collection("chatrooms").insertOne(newRoom, function(err, res) {
    if (err) throw err;
    var obj = { status : { type: "Success", message:"Room creation is a success",code:200,error:false} };;
    response.writeHead(200, {"Content-Type":"application/json; charset=utf-8"});
    response.write(JSON.stringify(obj));
    response.end();
    console.log("success!");
  });
}

app.get("/connectToRoom",function(request, response){
    var chatroomName = request.query.chatroomName;
    var roomExist = { chatroomName : chatroomName};
    console.log(roomExist);
    console.log(request.query);
    console.log('hello');
    console.log(request.params);
    console.log(request.body);
    db.collection("chatrooms").find(roomExist).project({_id:0}).toArray(function(err, res) {
      console.log(res);
      if (err) throw err;
      if(res.length !== 0){
        var content , error, sessionToken, type, message, code;
        error = false;
        type = "Success";
        message ="Chatroom connected success!";
        code =  200;
        var parsedObj = res[0].messages;
        console.log(parsedObj);
        var obj =  { status : { type: type, message:message,code:code,error:error},
        data:{ messages: res[0].messages}} ;
        response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
        response.write(JSON.stringify(obj));
        response.end();
        currentRoom = chatroomName;
      }
      else{
        var obj =  { status : { type: "Bad request", message:"Error the room  doesn't exist",code:201,error:true} };
        response.writeHead(200, {"Content-Type": "application/json; charset=utf-8"});
        response.write(JSON.stringify(obj));
        response.end();
      }
    });
});

//Socket setup
var io = socket(server);
io.on('connection', (socket) => {
  console.log("made socket connection",socket.id);
  socket.on('joinRoom', function(room) {
    console.log('joining room', room);
    if(currentRoom === room){
      socket.join(room);
    }
  })

  socket.on('leaveRoom', function(room) {
    console.log('leaving room', room);
    socket.leave(room);
  })

  socket.on('send', function(data) {
    console.log('sending message');
    if(currentRoom ===data.room){
      io.sockets.in(data.room).emit('message', data);
      var room = {chatroomName:data.room};
      var date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
      db.collection("chatrooms").update(room,{ $push: { messages: {type:"text",dateSent:date,content:data.data.message,username:data.data.username} } }, function(err, res) {
        if (err) throw err;
        console.log("pushed");
      });
    }
  });
});
