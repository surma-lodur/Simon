var socket = io.connect("http://"+window.location.hostname);
var token;
var Client = Client || {};

Client.greenBeep  = 415;
Client.redBeep    = 310;
Client.yellowBeep = 252;
Client.blueBeep   = 209;


// On Document Ready
$(document).ready(function(){
	try {
		Client.ctx = new(window.audioContext || window.webkitAudioContext);
	} catch(err) {
		$('span#legacy-audio').html('\
			<audio id="green" preload="auto" loop autobuffer></audio>\
			<audio id="red" preload="auto" loop autobuffer></audio>\
			<audio id="yellow" preload="auto" loop autobuffer></audio>\
			<audio id="blue" preload="auto" loop autobuffer></audio>\
			');
		Client.audioElements = Client.audioElements || {};

		$([Client.greenBeep, Client.redBeep, Client.yellowBeep, Client.blueBeep]).each(function(index, frequency){
			Client.initalizeLegacyBeep(frequency);
		});
	}


	$('button.simon').each(function(index, button){
		$(button).on('click', Client.simonPressEventHandler)
	});;

	$('input#nick').on('change', function(){		
		Client.changeNick();
	});

	$('input#nick').on('keypress keydown keyup ', function(e){
		if(e.keyCode == 13) { 
			Client.changeNick();
			e.preventDefault(); 
		}
	});
	socket.emit('request-token', {});
	Client.enableButton();
});

$(window).unload(function(){
	socket.emit('remove-player', {token: token});
});


Client.initalizeLegacyBeep = function(frequency){	
	// Audioelement erstellen
	if (Client.audioElements[frequency] == undefined) {
		Client.audioElements[frequency]  = new Audio("");
		// im DOM einfügen, sonst wird es nicht abgespielt
		document.body.appendChild(Client.audioElements[frequency]);
		
		// herausfinden welcher Medientyp abgespielt werden kann
		var canPlayType = Client.audioElements[frequency].canPlayType("audio/ogg");
		if(canPlayType.match(/maybe|probably/i)) {
			Client.audioElements[frequency].src = '' +frequency+ '.ogg';
		} else {
			Client.audioElements[frequency].src = '' +frequency+ '.mp3';
		}
	}
}


Client.simonPressEventHandler = function(){
	socket.emit('button-pressed', { 
		token: token,
		color: this.id
	});
}

Client.changeNick = function(){
	socket.emit('change-nick', {
		nick: $('input#nick').val(),
		token: token
	})
}

Client.disableButton = function(){
	Client.resetColorState();
	$('button.simon').each(function(index, button){
		$(button).attr('disabled', 'disabled');
	});
}

Client.enableButton = function(){
	Client.resetColorState();
	$('button.simon').each(function(index, button){
		$(button).removeClass('active');
		$(button).removeAttr('disabled');
	});
}
Client.resetColorState = function(){	
	$('button.simon').removeClass('active');
	$('button.simon').removeClass('btn-default');

	$('button.simon#green').addClass('btn-success');
	$('button.simon#red').addClass('btn-danger');
	$('button.simon#yellow').addClass('btn-warning');
	$('button.simon#blue').addClass('btn-info');
}

Client.beep = function(frequency){
	if (Client.ctx == undefined)
		return Client.legacyBeep(frequency);
	if (Client.osc != undefined)		
		Client.osc.noteOff(0);

	Client.osc = Client.ctx.createOscillator();
    // Only 0-4 are valid types.
    type = 0;
    Client.osc.frequency.value = frequency;
    Client.osc.type = type;

    Client.osc.connect(Client.ctx.destination);
    Client.osc.noteOn(0);
}
Client.legacyBeep = function(frequency){

	Client.audioElement = Client.audioElements[frequency];
	Client.audioElement.play();
}

Client.stopBeep = function(){
	if (Client.osc != undefined)		
		Client.osc.noteOff(0);

	if (Client.audioElement != undefined)		
		Client.audioElement.pause();
}

Client.ackStep = function(data){	
	socket.emit('ack-step', {
		id: data.id,
		token: token
	});
}

// ################
// Socket Callbacks
// ################

Client.simonSay = function(){
	logger('simon say');
	Client.disableButton();
	Client.stopBeep();
}

Client.simonSilence = function(){
	logger('simon is done');
	Client.enableButton();
	Client.stopBeep();
}

Client.handeNewToken = function(data){
	logger('handle new token');
	token = data.token;
	$('input#nick').attr('token', data.token);
	socket.emit('add-player', {
		token: data.token, 
		nick:  $('input#nick').val()
	});
}

Client.handleReceivedStats = function(data){
	logger('handle stats');
	var text_node = '<ul class="list-group">';
	data.forEach(function(player){
		text_node += '<li class="list-group-item';
		if (player.failed) {
			text_node += ' list-group-item-warning';
		}
		text_node += '">';
		text_node += '<span class="badge">';
		text_node += player.wins;
		text_node += '</span>';
		text_node += player.nick;
		text_node += '</li>';
	});
	$('span#players').html(text_node);
};

Client.allFailed = function() {
	logger('all failed');
	Client.disableButton();
	$('.alert.loose').show();
	setTimeout(function(){
		$('.alert.loose').fadeOut();
	}, 2000)
}
Client.getWinner = function(data) {
	logger('got winner');
	Client.disableButton();
	$('.alert.winner').html(
		'<center> Player '+ data.nick + ' wins</center>'
		);
	$('.alert.winner').show();
	setTimeout(function(){
		$('.alert.winner').fadeOut();
	}, 2000)

}

Client.lock = function(){
	logger('lock');
	Client.disableButton();
	$('.modal').modal({
		keyboard: false, 
		backdrop: 'static'
	});
}
Client.unlock = function(){
	logger('unlock');
	Client.enableButton();
	$('.modal').modal('hide');
};

Client.getGreen = function(data){
	Client.ackStep(data);
	if (data.hardwareAvailable)
		return;
	Client.resetColorState();
	$('button.simon#green').removeClass('btn-success');
	$('button.simon#green').addClass('active');
	$('button.simon#green').addClass('btn-default');
	Client.beep(Client.greenBeep);
};

Client.getRed = function(data){
	Client.ackStep(data);
	if (data.hardwareAvailable)
		return;
	Client.resetColorState();
	$('button.simon#red').removeClass('btn-danger');
	$('button.simon#red').addClass('active');
	$('button.simon#red').addClass('btn-default');
	Client.beep(Client.redBeep);
};

Client.getYellow = function(data) {
	Client.ackStep(data);
	if (data.hardwareAvailable)
		return;
	Client.resetColorState();
	$('button.simon#yellow').removeClass('btn-warning');
	$('button.simon#yellow').addClass('active');
	$('button.simon#yellow').addClass('btn-default');
	Client.beep(Client.yellowBeep);
};

Client.getBlue = function(data) {
	Client.ackStep(data);
	if (data.hardwareAvailable)
		return;
	Client.resetColorState();
	$('button.simon#blue').removeClass('btn-info');
	$('button.simon#blue').addClass('active');
	$('button.simon#blue').addClass('btn-default');
	Client.beep(Client.blueBeep);

}

// ##############
// Socket Methods
// ##############

socket.on('reset', function(){
	socket.emit('request-token', {});
	$('.modal').modal('hide');
	$('.alert.reset').show();
	setTimeout(function(){
		$('.alert.reset').fadeOut();
	}, 2000)
})


socket.on('simon-say',  	Client.simonSay);
socket.on('simon-silence',  Client.simonSilence);
socket.on('token',       Client.handeNewToken);
socket.on('stats',       Client.handleReceivedStats);
socket.on('all-failed',  Client.allFailed);
socket.on('winner',      Client.getWinner);
socket.on('lock',        Client.lock);
socket.on('unlock',      Client.unlock);

socket.on('green',       Client.getGreen);
socket.on('red',         Client.getRed);
socket.on('yellow',      Client.getYellow);
socket.on('blue',        Client.getBlue);

socket.on('keep-alive', function() {
	socket.emit('keep-alive', {token: token});
})


function logger(data){
	//console.log(data);
}