var Turn = require('node-turn');
var app = require('http').createServer({
  host: '0.0.0.0'
})
var io = require('socket.io')(app);

var server = new Turn({
  // set options,
  listeningIps: ['192.168.0.104'],
  relayIps: ['192.168.0.104'],
  authMech: 'long-term',
  credentials: {
    username: "password"
  }
});
server.start();
console.log('server started');

app.listen(5000);

// const RoomService = require('./RoomService')(io);

io.on('connection', function(socket){
  console.log(socket.id+' connected');
  socket.on('join', function(room) {
    socket.join(room);
  });
  // socket.on('start', function(message) {
  //   console.log(message);
  //   io.to('_room').emit('receive', message);
  // });
  // socket.on('join', function(room) {
  //   console.log(socket.id+' joined '+room);
  //   socket.join(room);
  // });
  // socket.on('ready', function(room) {
  //   console.log(socket.id+' ready for '+room);
  //   io.to(room).emit('ready', socket.id);
  // });
  // socket.on('offer', function (room, message) {
  //   console.log(room+' offer '+JSON.stringify(message));
  //   io.to(room).emit('offer', socket.id, message);
  // });
  // socket.on('answer', function (room, message) {
  //   console.log('answer');
  //   io.to(room).emit('answer', socket.id, message);
  // });
  socket.on('candidate', function (candidate) {
    console.log('candidate');
    io.emit('candidate', candidate);
  });
  socket.on('offer', (message) => {
    console.log('offer');
    console.log(message);
    io.emit('offer', message);
  });
  socket.on('answer', (message) => {
    console.log('answer');
    console.log(message);
    io.emit('answer', message);
  });
});

// io.sockets.on('connection', RoomService.listen);
// io.sockets.on('error', e => console.log(e));