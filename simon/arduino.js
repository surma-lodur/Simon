var Arduino     = Arduino || {};
var com = require("serialport");

com.list(function (err, ports) {
	console.log('Found following COM devices:\n')
	ports.forEach(function(port) {
		console.log('\t' + port.comName);
		console.log('\t ' + port.manufacturer);
	});
});

com.on('error', function(){
	Arduino.serial = undefined;
})

Arduino.serial = new com.SerialPort("COM9", {
	baudrate: 9600,
	parser: com.parsers.readline('\r\n')
});

if (Arduino.serial != undefined) {	
	Arduino.serial.on('error',function(e) {
		console.log('Port not available: ' + e);
	});

	Arduino.serial.on('open',function() {
		console.log('Port open');
	});

	Arduino.serial.on('data', function(data) {
	});
}


Arduino.playGreen = function(){
	if (Arduino.serial != undefined)
		Arduino.serial.write('0;');	
}
Arduino.playRed = function(){
	if (Arduino.serial != undefined)
		Arduino.serial.write('1;');	
}
Arduino.playYellow = function(){
	if (Arduino.serial != undefined)
		Arduino.serial.write('2;');	
}
Arduino.playBlue = function(){
	if (Arduino.serial != undefined)
		Arduino.serial.write('3;');	
}

Arduino.stop = function(){
	if (Arduino.serial != undefined)
		Arduino.serial.write('-;');
}

module.exports = Arduino;