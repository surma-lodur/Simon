var self;
var arduino = require('./arduino.js');
var guid    = require('guid');

var log_prefix = '###### '

function logger(data){
	console.log(log_prefix + data);
}

function Round(socket) {
	logger('New Round');
	this.players = {};
	this.steps   = [];
	this.play_speed = 400;
	this.socket = socket;
	self = this;
	this.addStep();
	this.playSteps();
}

Round.prototype.addPlayer = function(player) {
	logger('add player');
	var nick;
	if (player.nick.length == 0) {
		nick = 'Anonymous-' + Math.floor(Math.random() * 100000) + 1;
	} else {
		nick = player.nick;
	}

	this.players[player.token] = {
		wins: 0,
		nick: nick,
		step_played: -1
	};
}
Round.prototype.removePlayer = function(data) {
	logger('remove player');
	delete self.players[data.token];
}

Round.prototype.changePlayer = function(data){
	var nick;
	if ( self.players[data.token] == undefined){
		return;
	}
	if (data.nick.length == 0) {
		nick = 'Anonymous-' + Math.floor(Math.random() * 100000) + 1;
	} else {
		nick = data.nick;
	}

	self.players[data.token].nick = nick;
}

Round.prototype.hasPlayerCorrectPlayed = function(data, winCallback, callback) {
	var player = self.players[data.token];
	if (player == undefined) 
		return;
	player.step_played++;

	if (self.steps[player.step_played] == data.color) {
		if (self.playerIsDone(data)) {
			player.wins++;			
			self.socket.emit('simon-say');	
			self.addStep();
			setTimeout(self.playSteps, 1000);
			winCallback(player);
		} else {
			callback(player);
		}
		return true;
	} else {
		player.failed = true;
		return false;
	}
}
Round.prototype.playerIsDone = function(data){
	var player = self.players[data.token];
	return ((player.step_played + 1) == self.steps.length);
}

Round.prototype.hasAllPlayerFailed = function(){
	for (property in self.players) {
		if (self.players[property].failed == undefined){
			return false;
		}
	}
	return true;

}

Round.prototype.resetPlayedSteps = function(){
	for (property in self.players) {
		self.players[property].step_played = -1;
	}
}

Round.prototype.getPlayers = function(){
	var innerArray = [];
	for (property in this.players) {
		innerArray.push(this.players[property]);
	}
	return innerArray;
}



Round.prototype.addStep = function(){
	logger('Next Step');
	self.steps.push(
		self.getColor(Math.floor(Math.random(guid.raw()) * 4) + 1)
		);
}

Round.prototype.playSteps = function(){
	self.socket.emit('simon-say');		
	self.is_playing = true;
	if (self.players.length == 0) {
		setTimeout(self.playSteps, 2000);
	}	
	self.resetPlayedSteps();
	self.step_iterator = 0;
	setTimeout(self.playStep, 1000);
}

Round.prototype.playStep = function(){
	if (self.step_iterator >= self.steps.length){
		arduino.stop();
		self.is_playing = false;
		self.socket.emit('simon-silence');
		return;
	}

	self.socket.emit(self.steps[self.step_iterator], {
		id:  				self.step_iterator + 1,
		hardwareAvailable: (arduino.serial != undefined)
	});

	switch(self.steps[self.step_iterator]){
		case 'green':	arduino.playGreen();	break;
		case 'red':	    arduino.playRed();		break;
		case 'yellow':	arduino.playYellow();	break;
		case 'blue':	arduino.playBlue();	    break;
	}
	self.step_iterator++;

	self.waitRetry = 0;
	setTimeout(self.waitUntilAllAckStep, 100);		
}
Round.prototype.continuePlay = function(){
	arduino.stop();
	self.socket.emit('simon-say');
	setTimeout(self.playStep, self.play_speed);		
}

Round.prototype.waitUntilAllAckStep = function(data) {
	self.waitRetry++;
	if (self.waitRetry < 8){
		for (token in self.players){
			if(self.players[token].ackStep != self.step_iterator){
				setTimeout(self.waitUntilAllAckStep, 10);
				return
			}
		}
	}
	self.continuePlay();
}

Round.prototype.ackPlayerStep = function(data) {
	if (self.players[data.token] != undefined)
		self.players[data.token].ackStep = data.id;
}
Round.prototype.getColor = function(int){
	switch(int){
		case 1: return 'green';
		break;
		case 2:	return 'red';
		break;
		case 3:	return 'yellow';
		break;
		case 4:	return 'blue';
		break;
	}
}
// 
module.exports = Round;