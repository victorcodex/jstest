var api = "wss://js-assignment.evolutiongaming.com/ws_api";
var socket = new WebSocket(api);
var connected = false;

socket.onopen = function()
{
	connected = true;
};

socket.onmessage = function (evt) 
{ 
	app.processMessage(evt.data);
};

socket.onclose = function()
{ 
	connected = false;
};
	
window.onbeforeunload = function(event) {
  socket.close();
};