
var arduino = require('./arduino.js');
var Round   = require('./round.js');
var guid    = require('guid');
var io;
var self;
var idle_time = 60000;



var log_prefix = '-> '

function logger(data){
	console.log(log_prefix + data);
}


function Handler(app) {
	io           = require('socket.io').listen(app, { log: false });
	this.round   = new Round(io.sockets);
	self 		 = this;
	io.sockets.on('connection', this.handleConnection); 
}

function reset(){
	clearTimeout(timeout);
	self.round = new Round(io.sockets);
	io.sockets.emit('reset');
	logger("---------- reset");
}

var	timeout = setTimeout(reset, idle_time);

function retouch(){
	logger("retouch");
	console.log(clearTimeout(timeout));
	timeout = setTimeout(reset, idle_time);
}

Handler.prototype.handleConnection = function(socket){	
	socket.on('request-token', function(){		
		socket.emit('token', {
			token: guid.raw()
		});
		retouch();
		self.debugCallback();
	});
	socket.on('add-player',  self.addPlayer);
	socket.on('change-nick', self.changeNick);
	socket.on('button-pressed',   self.playerTriggerStep);
	socket.on('green',  self.green);
	socket.on('red',    self.red);
	socket.on('yellow', self.yellow);
	socket.on('blue',   self.blue);
	socket.on('remove-player', self.removePlayer);
}

Handler.prototype.addPlayer = function(data){
	self.round.addPlayer(data);
	self.sendStats();
	self.debugCallback();
}
Handler.prototype.removePlayer = function(data) {
	self.round.removePlayer(data);
	self.resetOnAllFailed();
}

Handler.prototype.changeNick = function(data){
	logger('change.nick');
	self.round.changePlayer(data);	
	retouch();
	self.debugCallback();
	self.sendStats();
}

Handler.prototype.playerTriggerStep = function(data){
	retouch();
	logger('-> triggered');
	if (data.token == undefined || data.token.length == 0 || self.round.is_playing == true){
		return;
	}
	if (self.round.hasPlayerCorrectPlayed(data, self.playerWon, self.playersSaved) == true){		
		logger(data.token + ' successfully step');
	} else {
		this.emit('lock');
		logger(data.token + ' failed');
		self.resetOnAllFailed();
	}
	self.sendStats();
}

Handler.prototype.resetOnAllFailed = function(){
	if (self.round.hasAllPlayerFailed()){
		logger('all failed');
		io.sockets.emit('all-failed');
		reset();
	}
}

Handler.prototype.playersSaved = function(){
	io.sockets.emit('unlock');
}

Handler.prototype.playerWon = function (data){	
	io.sockets.emit('winner', {
		token: data.token,
		nick:  data.nick
	});
}

Handler.prototype.sendStats = function(){	
	logger('send-stats');
	io.sockets.emit('stats', self.round.getPlayers());
}

Handler.prototype.green = function(){
	arduino.playGreen();
	setTimeout(arduino.stop, 500);
	retouch();
}

Handler.prototype.red = function(){
	arduino.playRed();
	setTimeout(arduino.stop, 500);
	retouch();
}

Handler.prototype.yellow = function(){
	arduino.playYellow();
	setTimeout(arduino.stop, 500);
	retouch();
}

Handler.prototype.blue = function(){
	arduino.playBlue();
	setTimeout(arduino.stop, 500);
	retouch();
}

Handler.prototype.debugCallback = function(){
	//console.log('+++++++++++++++');
	//console.log(self.round);
	//console.log('+++++++++++++++');
}
module.exports = Handler;