/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is the iPalem extension for Mozilla Firefox.
 *
 * The Initial Developer of the Original Code is 
 * Sergey Mirkin <info@ipalem.com>
 * Portions created by the Initial Developer are Copyright (C) 2005
 * the Initial Developer. All Rights Reserved.
 *
 * ***** END LICENSE BLOCK ***** */
//all global variables go here
function ipalemProperties(){
	this.prefService = Components.classes["@mozilla.org/preferences-service;1"]
	   	.getService(Components.interfaces.nsIPrefService);
	this.prefBranch = this.prefService.getBranch("extensions.ismsend.");
	this.http_request = null;	//ajax request
	this.menuIndex = null;	//keeps track of previous menu item (for editing purposes)
	this.menuChanged = false;
	this.menuInited = false;
}
var ipalem_global = new ipalemProperties();
//toggles the toolbar
function IPALEM_toggle(){
	var toolbar = document.getElementById("IPALEM_TB");
    toolbar.collapsed = !toolbar.collapsed;
    document.persist("IPALEM_TB", "collapsed");
    if (toolbar.collapsed){
    	ipalem_global.prefBranch.setBoolPref("collapsed",true);  
    }else{
    	ipalem_global.prefBranch.setBoolPref("collapsed",false); 
    	IPALEM_initMenu();	//load file if not loaded anything yet
    }
}
//sets menu index so that we know what value to modify
function IPALEM_menuChange(event){
	var menu = document.getElementById("IPALEM_menu");
	ipalem_global.menuIndex = new Array(menu.selectedIndex,menu.label);
}
function IPALEM_menuEdit(event){
	if (event.keyCode != event.DOM_VK_RETURN)return;
	var menu = document.getElementById("IPALEM_menu");
	//if new entry or modified entry then item == null and menu.selectedIndex == -1
	if (menu.selectedIndex == -1){
		if (Trim(menu.label) == "" && ipalem_global.menuIndex != null){
			ipalem_global.menuChanged = true;
			//need to delete an entry
			menu.removeItemAt(ipalem_global.menuIndex[0]);
		}else{
			IPALEM_newItem();
		}
	}
}
function IPALEM_newItem(){
	var menu = document.getElementById("IPALEM_menu");
	if (Trim(menu.label) != ""){
		//it is a new entry
			var ar = menu.value.replace(/[^a-z0-9]/gi," ").replace(/[\s\t]+/gi," ").split(/[ ]/);
			if (ar.length < 1)return;	//invalid
			var phone = ""; 
			var name = "";
			for (var i in ar){
				if (ar[i].match(/[0-9]+/))
					phone += ar[i];
				if (ar[i].match(/[a-zA-Z]+/))
					name += ar[i]+" ";
			}
			name = Trim(name);
			phone = Trim(phone);
			if (phone == "")return;
			menu.appendItem(phone+", "+name);
			ipalem_global.menuChanged = true;
	}
}
//1) Initialises the toolbar button on first run and saves the note to itself in preferences
//2) creates a dummy rdf file for phonebook store
//3) everytime - loads menu
function IPALEM_onInitToolbar() {
   //First Run? 
   if(!ipalem_global.prefBranch.prefHasUserValue("firstrun")){ 
		   	//create a phonebook file
		   	var file = Components.classes["@mozilla.org/file/directory_service;1"]
		                     .getService(Components.interfaces.nsIProperties)
		                     .get("ProfD", Components.interfaces.nsILocalFile)
		   file.append("ipalem_book.dat");
		   if( !file.exists()){
		   		file.create(Components.interfaces.nsILocalFile.NORMAL_FILE_TYPE, 0755);
		   		//store the absolute path in preferences
				ipalem_global.prefBranch.setComplexValue("phonebook", Components.interfaces.nsILocalFile, file);
				//create a default template
				// file is nsIFile, data is a string
				var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
				                         .createInstance(Components.interfaces.nsIFileOutputStream);
				
				// use 0x02 | 0x10 to open file for appending.
				foStream.init(file, 0x02 | 0x20, 0755, 0); // write, create, truncate
				var data = '';
				foStream.write(data, data.length);
				foStream.flush();
				foStream.close();
			}
			
		      // find address bar 
		      var urlbarNode = document.getElementById("urlbar-container"); 
		
		      // Address bar found and button not already in a toolbar 
		      if ( (urlbarNode != null) && (document.getElementById("ismsend-button") == null) ) 
		      { 
		         // get address bar's toolbar 
		         var toolbarNode = urlbarNode.parentNode; 
		
		         // add your button in front of address bar 
		         if (toolbarNode.insertItem("ismsend-button",urlbarNode,null,false)) 
		         { 
		            // get toolbar's currentset and remove all instances of your button if already stored 
		            var currentset = toolbarNode.currentSet.replace(/ismsend-button,?/gi,""); 
		             
		            // remove end of line comma is there is one 
		            if (currentset.charAt(currentset.length-1) == ",") currentset = currentset.substring(0, currentset.length - 1); 
		
		            // add your button before address bar in currentset and make it persistent 
		            currentset = currentset.replace(/urlbar-container/i,"ismsend-button,urlbar-container"); 
		            toolbarNode.setAttribute("currentset",currentset); 
		            toolbarNode.currentSet = currentset; 
		            document.persist(toolbarNode.id,"currentset"); 
		         } 
		      }
		      // set first run preference so we don't do this again 
		   	ipalem_global.prefBranch.setBoolPref("firstrun",true);
		   	ipalem_global.prefBranch.setBoolPref("collapsed",false);   
   }	//end first run
   // stop listening to load
   setTimeout("window.removeEventListener('load', IPALEM_onInitToolbar, false);", 0);
   if (ipalem_global.prefBranch.prefHasUserValue("collapsed") && ipalem_global.prefBranch.getBoolPref("collapsed")){
   		return;
   }
   IPALEM_initMenu();
}
function IPALEM_initMenu(){
	if (ipalem_global.menuInited)return;
	//add lines to the menu 
   var menu = document.getElementById('IPALEM_menu');
   var file = Components.classes["@mozilla.org/file/local;1"].
            createInstance(Components.interfaces.nsILocalFile);
   var file = ipalem_global.prefBranch.getComplexValue("phonebook", Components.interfaces.nsILocalFile);
   if( !file.exists())
   		file.create(Components.interfaces.nsILocalFile.NORMAL_FILE_TYPE, 0755);
   // open an input stream from file
	var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
    	.createInstance(Components.interfaces.nsIFileInputStream);
	istream.init(file, 0x01, 0755, 0);
	istream.QueryInterface(Components.interfaces.nsILineInputStream);
	// read line by line
	var line = {}, hasmore;
	do {
		hasmore = istream.readLine(line);
		if (Trim(line.value) == "")continue; //in case it is just a \n - quick fix up
		menu.appendItem(line.value,line.value); 
	}while(hasmore);
	istream.close();
	ipalem_global.menuInited = true;
	//all event registration should go here
   	menu.addEventListener("keypress",IPALEM_menuEdit,false);
   	menu.addEventListener("command", IPALEM_menuChange, false)
   	window.addEventListener("unload",IPALEM_saveMenu,false);
}
function IPALEM_saveMenu(){
	if (!ipalem_global.menuChanged)return;
	var file = Components.classes["@mozilla.org/file/local;1"].
            createInstance(Components.interfaces.nsILocalFile);
    var file = ipalem_global.prefBranch.getComplexValue("phonebook", Components.interfaces.nsILocalFile);
	var childNodes = document.getElementById('IPALEM_menupopup').childNodes;
	var data = "";
	for (var i = 0; i < childNodes.length; i++) {
		data += childNodes[i].getAttribute("label")+"\n";
	}
	var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
		                         .createInstance(Components.interfaces.nsIFileOutputStream);
		
	// use 0x02 | 0x10 to open file for appending.
	foStream.init(file, 0x02 | 0x20, 0755, 0); // write, create, truncate
	foStream.write(data, data.length);
	foStream.flush();
	foStream.close();
}
//Send the SMS message
function IPALEM_SendSMS(){  
	// Get the value in the boxes
	var messageToSend = document.getElementById("IPALEM_fullMessage").value;
	var from = document.getElementById("IPALEM_yourNumber").value;
	var numberToSendTo = "";

	//Get address
	var flag = false;
	try{
		numberToSendTo =  document.getElementById("IPALEM_menu").selectedItem.value;
	}catch(e){
		numberToSendTo = document.getElementById("IPALEM_menu").inputField.value;
		flag = true;
	}

	//Check input
	if(Trim(numberToSendTo.replace(/[^0-9]/,"")) == ""){
		alert("You need to enter a number!");
	}else if (Trim(messageToSend) == ""){
		alert("You need to enter a message!");
	}else{
		if (flag)IPALEM_newItem();
		//send message
		var txt = "to="+escape(numberToSendTo) + "&message=" + escape(messageToSend) + "&from=" + escape(from);
		if (IPALEM_sendSMSPOST(txt)){
			//if message was send successfully from the toolbar, clear message value
			document.getElementById("IPALEM_fullMessage").value = "";
			document.getElementById("IPALEM_status").style.display = "block";
			IPALEM_timeout = setTimeout(IPALEM_removeAfterTimeout,1000);
		}
	}
}
var IPALEM_timeout;
/*removes whatever message was last set to display*/
function IPALEM_removeAfterTimeout(){
	clearTimeout(IPALEM_timeout);
	document.getElementById("IPALEM_status").style.display = "none";
}
function IPALEM_sendSMSPOST(post){
	if (!IPALEM_initRequest()){
		throw "failed to initiate XMLHttpRequest";
	}
	//encrypt and send sms
	post = post;
	ipalem_global.http_request.onreadystatechange = null;
	ipalem_global.http_request.open('POST',"http://www.ipalem.com/action?v=send", false);
	ipalem_global.http_request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	ipalem_global.http_request.send(IPALEM_encrypt(post));
	//for now just return true (in the future we should probably check wherever the server accepted request)
	return true;
}
function IPALEM_LoadURL(URL){
	window._content.document.location = URL;
	window.content.focus();
}

//all networking stuff goes here
function IPALEM_initRequest(){
	if (ipalem_global.http_request != null)return true;
	if (window.XMLHttpRequest) { // Mozilla, Safari,...
		ipalem_global.http_request = new XMLHttpRequest();
        if (ipalem_global.http_request.overrideMimeType) {
      		ipalem_global.http_request.overrideMimeType('text/xml');
        }
	}
	if (!ipalem_global.http_request){
		alert("sms error: failed to initiate XMLHttpRequest");
		return false;
	}
	return true;
}
/*
function IPALEM_receive(){
	if (IPALEM_http_request.readyState == 4){
		if (IPALEM_http_request.status == 200){
			var text = IPALEM_http_request.responseText;
			IPALEM_http_request.onreadystatechange = null;
			if (Trim(text) != ""){
				document.cookie = text;
			}
		}
	}
}*/
//utils
function Trim(s) {
  return s.replace(/^\s+/, "").replace(/\s+$/, "");
}
//will be available in the next update (I've got a real job to go to :-)
function IPALEM_encrypt(str){
	return str;
}
function setInnerHTML(element, toValue){

		var range = document.createRange();
		range.selectNodeContents(element);
		range.deleteContents();
		element.appendChild(range.createContextualFragment(toValue));
}
//register for load event (NOTE: all event registration should happen in the function specified below)
window.addEventListener("load", IPALEM_onInitToolbar, false);