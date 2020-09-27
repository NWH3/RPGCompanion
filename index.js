require('dotenv').config();
fs = require('fs');
const Discord = require('discord.js');
const client = new Discord.Client();

let DICE_COMMAND_REGEX = /^!r[\s]*[0-9]*[dD][0-9]+[\s]*[\+\-]?[\s]*[0-9]*[\s]*$/;
let CREATE_COMMAND_REGEX = /^![CcUuDdSs][\s]*([A-Za-z0-9]+=([0-9]*|\"[A-Za-z0-9\s\.\,\'\!\@\#\-\{\}\:\;\>\<\?\^\&\*\+\`\~]+\"[\s]*|\{([A-Za-z0-9]+:\"[A-Za-z0-9\s\.\,\'\!\@\#\-\>\<\?\^\&\*\+\`\~]+\"(\,?))+\}[\s]*|\[(\{([A-Za-z0-9]+:\"[A-Za-z0-9\s\.\,\'\!\@\#\-\>\<\?\^\&\*\+\`\~]+\"(\,)?)+\}(\,?))+\][\s]*)[\s]*)+$/;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});
 
// All messages that start with ! will be looked at
client.on('message', msg => {
	try {
		// If message starts with !, attempt to process it
		if (msg.content.startsWith('!')) {
			let originalMsg = msg.content;
			let trimmedMsg = originalMsg.replace(/\s/g, '');
			let msgAry = trimmedMsg.split('');

			// Valid dice commands !r 2d6 +/- X, where X is some number
			if (msgAry.length >= 4 && msgAry[1] === 'r' &&  DICE_COMMAND_REGEX.test(originalMsg)) {
				if (msgAry[2].toUpperCase() === 'D') {
					// Has single dice roll
					let numberOfEdges = msgAry[3];
					let totalTimeInMS = new Date().getTime();
					let randomNumber = Math.random();
					let randomNumberTwo = Math.random();
					let roll = Math.floor(((totalTimeInMS * randomNumber) + randomNumberTwo) % numberOfEdges) + 1;
					msg.reply('Result: ' + roll);
				} else if (msgAry.length >= 5 && msgAry[3].toUpperCase() === 'D') {
					// Has multiple dice rolls
					let numberOfRolls = msgAry[2];
					let numberOfEdges = msgAry[4];
					let total = 0;
					let finalMsg = '';
					for (let index = 0; index < numberOfRolls; index++) {		
						let totalTimeInMS = new Date().getTime();
						let randomNumber = Math.random();
						let randomNumberTwo = Math.random();
						let roll = Math.floor(((totalTimeInMS * randomNumber) + randomNumberTwo) % numberOfEdges) + 1;
						total += roll;
						finalMsg += '[' + roll + '] ';
					}
					msg.reply('Result(s): ' + finalMsg.trim() + ' with total: ' + total);
				}
			}

			// Valid create character commands !c fieldOne="value one" fieldTwo={name:"a1",attack:"a1"} fieldArray=[{name:"a",attack:"a"},{name:"b",attack:"b"}]
			var character = {};
			if (msgAry.length >= 7 && msgAry[1].toUpperCase() === 'U' && CREATE_COMMAND_REGEX.test(originalMsg)) {
				fs.readFile(msg.author.username + '_character.json', 'utf8', function(err, data) {
					character = JSON.parse(data)
					character = parseContents(character, originalMsg)
			
					let characterJson = JSON.stringify(character);
					fs.writeFile(msg.author.username + '_character.json', characterJson, function (err) {
						if (err){
							return console.log(err);
						}
						console.log('Updated contents to ' + msg.author.username + '_characters.json...');
					});
					msg.reply('Processed update character: ' + characterJson);
				});
			} else if (msgAry.length >= 7 && msgAry[1].toUpperCase() === 'C' && CREATE_COMMAND_REGEX.test(originalMsg)) {
				character = parseContents(character, originalMsg)
			
				let characterJson = JSON.stringify(character);
				fs.writeFile(msg.author.username + '_character.json', characterJson, function (err) {
					if (err){
						return console.log(err);
					}
					console.log('Wrote contents to ' + msg.author.username + '_character.json...');
				});
				msg.reply('Processed create character: ' + characterJson);
			} else if (msgAry.length >= 2 && msgAry[1].toUpperCase() === 'D') {
				character = parseContents(character, originalMsg)
			
				let characterJson = JSON.stringify(character);
				fs.unlinkSync(msg.author.username + '_character.json');
				msg.reply('Processed delete character: ' + characterJson);
			} else if (msgAry.length >= 2 && msgAry[1].toUpperCase() === 'S') {
				fs.readFile(msg.author.username + '_character.json', 'utf8', function(err, data) {
					character = JSON.parse(data)
		
					let characterJson = JSON.stringify(character);
					fs.writeFile(msg.author.username + '_character.json', characterJson, function (err) {
						if (err){
							return console.log(err);
						}
						console.log('Reading contents to ' + msg.author.username + '_character.json...');
					});
					msg.reply('Processed read character: ' + characterJson);
				});
			}
		}
	 } catch(err) {
		console.log('Unable to parse contents sent with exception message: ' + err);
	}
}); 
client.login(process.env.SECRET);

let parseContents = function(character, originalMsg) {
	let originalMsgAry = originalMsg.split(/[\"\}\]][\s]+|\![A-Za-z]\s/);
	for (let pos = 1; pos < originalMsgAry.length; pos++) {
		// Skip first position and start at 1
		let msgPart = originalMsgAry[pos];
		let parts = msgPart.split('\=');
		if (parts.length >= 2 && parts[1].startsWith('\"')) {
			// Is just value, string/int
			character[parts[0]] = parts[1].replace(/\"/g, '');
		} else  if (parts.length >= 2 && parts[1].startsWith('\{')) {
			// Is object
			let characterObj = {};
			let objPos = 0;
			let fields = parts[1].split(/\,|\:/);
			while ((objPos + 1) < fields.length) {
				let fieldName = fields[objPos].replace(/\"|\{|\}/g,'');
				characterObj[fieldName] = fields[objPos + 1].replace(/\{|\}|\"/g,'');
				objPos += 2;
			}
			character[parts[0]] = characterObj;
		} else if (parts.length >= 2 && parts[1].startsWith('\[')) {
			// Is array
			let objects = parts[1].replace(/\[|\]/g,'').split('\}\,\{');
			let characterObjAry = [];
			for (let objPos = 0; objPos < objects.length; objPos++) {
				let object = objects[objPos].replace('\}|\{',''); // Clean up object
				let objFields = object.split(',');
				let characterObj = {};
				for (let objFieldPos = 0; objFieldPos < objFields.length; objFieldPos++) {
					let objField = objFields[objFieldPos];
					let objFieldParts = objField.split(/\:/);
					if (objFieldParts.length >= 2) {
						// Is value, parse and add to character
						characterObj[objFieldParts[0].replace(/\"|\{|\}/g, '')] = objFieldParts[1].replace(/\"|\{|\}/g, '');
					}
				}
				characterObjAry.push(characterObj);
			}
			character[parts[0]] = characterObjAry;
		}
	}
	return character;
}
