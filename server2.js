const express = require('express');
const app = express();
const server = require('http').createServer(app);
var client = require('socket.io')(server);
//const client = require('socket.io').listen(4000).sockets;

const mongo = require('mongodb').MongoClient;

app.get('/', function(req, res, next) {
  res.sendFile(__dirname + '/public/index.html')
});

app.use(express.static('public'));

mongo.connect('mongodb://127.0.0.1/mongochat', function(err, db) {
  if (err) {
    throw err;
  }
  console.log("mongoDB connected..");

  //Connect to socket.io
  client.on('connection', function(socket) {
    console.log('Client connected...');
    let chat = db.collection('chats');

    //Create function to send status
    sendStatus = function(s) {
      socket.emit('status', s);
    }

    //Get chats from mongo collection
    chat.find().limit(100).sort({_id: 1}).toArray(function(err, res) {
      if (err) {
        throw err;
      }

      //Emit the message
      socket.emit('output', res);

    });

    //Handle input events
    socket.on('input', function(data) {
      let name = data.name;
      let message = data.message;

      //check for name and message
      if (name == '' || message == '') {
        //Send error status
        sendStatus('Please enter a name and message');
      } else {
        //insert message
        chat.insert({
          name: name,
          message: message
        }, function() {
          client.emit('output', [data]);

          //send status object
          sendStatus({message: 'Message sent', clear: true});
        });
      }
    });
    socket.on('clear', function(data) {
      //remove all chat on collection
      chat.remove({}, function() {
        //Emit cleared
        socket.emit('cleared');
      });
    });
  });
});

server.listen(4000).socket;
