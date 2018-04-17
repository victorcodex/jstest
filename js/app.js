// Ideally watch app.tables for changes and update UI. No time for that now
var app = {
	tables: [],
	updatePending: [],
	removalPending: [],
	
	login: function(){
		var data = {
		  "$type": "login",
		  "username": document.querySelector('#username').value,
		  "password": document.querySelector('#password').value
		};
		if(connected){
			socket.send(JSON.stringify(data));
		}else{
			throw new Error("Web Socket Server Disconnected");
		}
	},
	
	ping: function(){
		var data = {
		  "$type": "ping",
		  "seq": 1
		};
		if(connected){
			socket.send(JSON.stringify(data));
		}else{
			throw new Error("Web Socket Server Disconnected");
		}
	},
	subscribe: function(){
		var data = {
		  "$type": "subscribe_tables"
		};
		if(connected){
			socket.send(JSON.stringify(data));
		}else{
			throw new Error("Web Socket Server Disconnected");
		}
	},
	unsubscribe: function(){
		var data = {
		  "$type": "unsubscribe_tables"
		};
		if(connected){
			socket.send(JSON.stringify(data));
		}else{
			throw new Error("Web Socket Server Disconnected");
		}
	},
	doAddTable: function(){
		name = document.querySelector('#table_name').value;
		p = document.querySelector('#table_participants').value;
		
		app.addTable(name, p);
		app.loadScreen('app');
	},
	
	doEditTable: function(id){
		table = app.tables[ app.util.getTable(id) ];
		document.querySelector('#edit_table_name').value = table.name;
		document.querySelector('#edit_table_participants').value = table.participants;
		document.querySelector('#table_id').value = table.id;
		
		app.loadScreen('edittable');
	},
	
	doSaveTable: function(){
		name = document.querySelector('#edit_table_name').value;
		p = document.querySelector('#edit_table_participants').value;
		id = document.querySelector('#table_id').value;
		
		app.editTable(id, name, p);
		app.loadScreen('app');
	},
	
	addTable: function( tableName, participants){
		var data = {
		  "$type": "add_table",
		  "after_id": 1,
		  "table": {
			"name": tableName,
			"participants": participants
		  }
		};
		
		if(connected){
			socket.send(JSON.stringify(data));
		}else{
			throw new Error("Web Socket Server Disconnected");
		}
	},
	updateTable: function(id, tableName, participants ){
		// store old table info to revert back later if update fails
		var index = app.util.getTable(id);
		table = app.tables[ index ];
		app.updatePending[ app.updatePending.length ] = table;
		
		// update UI
		app.tables[index].name = tableName;
		app.tables[index].participants = participants;
		app.renderTables(); // update ui
		
		var data = {
		  "$type": "update_table",
		  "table": {
			"id": id,
			"name": tableName,
			"participants": participants
		  }
		};
		
		if(connected){
			socket.send(JSON.stringify(data));
		}else{
			throw new Error("Web Socket Server Disconnected");
		}
	},
	removeTable: function(id){
		// store old table info to revert back later if update fails
		index = app.util.getTable(id);
		table = app.tables[ index ];
		app.removalPending[ app.removalPending.length ] = table;
		console.log( app.removalPending );
		app.removalPending[ app.removalPending.length -1 ].index = index; // where in the tables list was this table
		
		// update UI
		app.tables.splice(index, 1);
		app.renderTables(); // update ui
		var data = {
		  "$type": "remove_table",
		  "id": id
		};
		
		if(connected){
			socket.send(JSON.stringify(data));
		}else{
			throw new Error("Web Socket Server Disconnected");
		}
	},
	
	processMessage: function(msg){
		try{
			var message = JSON.parse(msg);
			type = message.$type;
			
			switch(type){
				case "login_failed":
					Messenger().post({
					  message: "Login Failed", type: 'error', 
					  showCloseButton: true
					});
				break;
				case "login_successful":
					// move to ui
					app.loadScreen("app");
					app.subscribe();
				break;
				case "pong":
					console.log(message.seq);
				break;
				case "table_list":
					var tables = message.tables;
					app.tables = tables;
					app.renderTables(); // update ui
				break;
				case "not_authorized":
					// notify
					Messenger().post({
					  message: "Not Authorized", type: 'error', 
					  showCloseButton: true
					});
				break;
				case "removal_failed":
					id = message.id;
					index = app.util.getTableInArray(id, app.removalPending); // item index in removalPending Array
					table = app.removalPending[index];
					tableIndex = table.index; // previous index position of table in app.tables[]
					delete table.index;
					app.tables.splice(tableIndex, 0, table); // add table back to list at old index
					app.removalPending.splice(index, 1); // remove from pending array
					app.renderTables(); // update ui
				break;
				case "update_failed":
					id = message.id;
					index = app.util.getTableInArray(id, app.updatePending);
					table = app.updatePending[index];
					currentTableIndex = app.util.getTable(id); 
					app.tables[ currentTableIndex ] = table; // revert to old table data
					app.updatePending.splice(index, 1); // remove from update pending array
					app.renderTables(); // update ui
				break;
				case "table_added":
					// add to tables
					app.tables[ app.tables.length ] = message.table;
					app.renderTables(); // update ui
				break;
				case "table_removed":
					// delete from removal pending, UI already updated
					id = message.id;
					index = app.util.getTableInArray(id, app.removalPanding);
					app.removalPending.splice(index, 1);
				break;
				case "table_updated":
					// delete from update pending, UI already updated
					id = message.table.id;
					index = app.util.getTableInArray(id, app.updatePanding);
					app.updatePending.splice(index, 1);
				break;
			}
		}
		catch(e){
		
		}
	},
	
	util: {
		getTable: function(id){
			id = parseInt(id);
			for(i in app.tables){
				table = app.tables[i];
				if(table.id === id){
					return i;
				}
			}
			return null;
		},
		
		getTableInArray: function(id, arr){
			id = parseInt(id);
			for(i in arr){
				table = arr[i];
				if(table.id === id){
					return i;
				}
			}
			return null;
		}
	},
	
	loadScreen: function(id){
		center = document.querySelector('.page.center');
		cid = center.getAttribute("id");
		if(cid == id){return; }
		
		other = document.getElementById(id);
		if(other == null){ return; }
		other.className = "page right";
		setTimeout(function(){
			other.className = "page transition center"; 
			center.className = "page transition left";
		}, 50);
	},
	
	renderTables: function(){
		
		
		var root = document.getElementById("tables");
		root.innerHTML = "";
		
		for(i in app.tables){
			table = app.tables[i];
			p = table.participants;
			
			var div = document.createElement("div");
			div.className = "table";
			var html = "<h3>" + table.name + "</h3>";
			
			for(x = 1; x <= 12; x++){
				if(x <= p){
					// table occupied
					html += "<i class='fas fa-user icon occupied'></i>";
				}else{
					// table empty
					html += "<i class='far fa-user icon'></i>";
				}
			}
			html += "<button onclick='app.removeTable(\"" + table.id.toString() + "\")'>Remove Table</button>";
			html += "<button onclick='app.doEditTable(\"" + table.id.toString() + "\")'>Edit Table</button>";
			div.innerHTML = html;
			root.appendChild(div);
		}
	}
};