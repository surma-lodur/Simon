
var SocketHandler  = require('./simon/socket_handler.js');
var app = require('http').createServer(handler);
var fs  = require('fs');

app.listen(80);
var sock = new SocketHandler(app);

function handler (req, res) {
	console.log("--------------");
	console.log(req.url);

	var filename;

	if(req.url.match(/.*(\.js|\.css|\.ogg|\.mp3)/) == null){
		filename = __dirname + '/public/index.html';
	} else {
		filename = __dirname + '/public' + req.url
	}


	fs.readFile(filename, function (err, data) {
		if (err) {
			res.writeHead(500);
			return res.end('Error loading index.html');
		}
		if (req.url.match(/.*\.js/))
			res.setHeader("Content-Type", "application/javascript");
		if (req.url.match(/.*\.css/))
			res.setHeader("Content-Type", "text/css");
		if (req.url == '/favicon.ico')
			res.setHeader("Content-Type", "image/x-icon");		
		if (req.url.match(/.*\.ogg/))
			res.setHeader("Content-Type", "audio/ogg");
		if (req.url.match(/.*\.mp3/))
			res.setHeader("Content-Type", "audio/mpeg");

		res.writeHead(200);
		res.end(data);
	});
}
