const express = require('express');
const app = express();
const server = require('http').createServer(app);
var client = require('socket.io')(server);

const mongo = require('mongodb').MongoClient;
//const client = require('socket.io').listen(4000).sockets;
var PORT = process.env.PORT || 8000;

app.get('/', function(req, res, next) {
  res.sendFile(__dirname + '/public/index.html')
});

app.use(express.static('public'));
var db = process.env.MONGODB_URI || 'mongodb://127.0.0.1/mongochat';
console.log("Connecting database: " ,db);
// Connect to mongo
mongo.connect(db, function(err, db){
    if(err){
        throw err;
    }

    console.log('MongoDB connected...');

    // Connect to Socket.io
    client.on('connection', function(socket){
        //Uses db chats
        let chat = db.collection('chats');

        // Create function to send status
        sendStatus = function(s){
            socket.emit('status', s);
        }

        // Get chats from mongo collection
        chat.find().limit(100).sort({_id:1}).toArray(function(err, res){
            if(err){
                throw err;
            }

            // Emit the messages
            socket.emit('output', res);
        });

        // Handle input events
        socket.on('input', function(data){
            let name = data.name;
            let message = data.message;

            // Check for name and message
            if(name == '' || message == ''){
                // Send error status
                sendStatus('Please enter a name and message');
            } else {
                // Insert message
                chat.insert({name: name, message: message}, function(){
                    client.emit('output', [data]);

                    // Send status object
                    sendStatus({
                        message: 'Message sent',
                        clear: true
                    });
                });
            }
        });

        // Handle clear
        socket.on('clear', function(data){
            // Remove all chats from collection
            chat.remove({}, function(){
                // Emit cleared
                socket.emit('cleared');
            });
        });
    });
});

// Start the server
server.listen(PORT, function() {
  console.log("Now listening on port %s! Visit localhost:%s in your browser.", PORT, PORT);
}).socket;
