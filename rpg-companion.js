/*
 * rpg-companion.js is designed to parse out and execute the commands for 
 * the RPGCompanion Discord Bot 
 *
 * @author Nathanial W. Heard
 */
// Imports
const fs = require('fs');
const quantumRandom = require('qrandom');

// Regex validation for commands
const DICE_COMMAND_REGEX = /^!r[\s]*[0-9]*[dD][0-9]+[\s]*[\+\-\*\/]?[\s]*[0-9]*[\s]*$/;
const CREATE_COMMAND_REGEX = /^![CcUuDdSs][\s]*([A-Za-z0-9]+=([0-9]*|\"[A-Za-z0-9\s\.\,\'\!\@\#\-\{\}\:\;\>\<\?\^\&\*\+\`\~]+\"[\s]*|\{([A-Za-z0-9]+:\"[A-Za-z0-9\s\.\,\'\!\@\#\-\>\<\?\^\&\*\+\`\~]+\"(\,?))+\}[\s]*|\[(\{([A-Za-z0-9]+:\"[A-Za-z0-9\s\.\,\'\!\@\#\-\>\<\?\^\&\*\+\`\~]+\"(\,)?)+\}(\,?))+\][\s]*)[\s]*)+$/;
const DICE_REGEX = /^[\s]*[0-9]*[dD][0-9]+[\s]*[\+\-\*\/]?[\s]*[0-9]*[\s]*$/;
const ATTACK_REGEX = /^!(attack|atk|attk)[\s]*$/i;
const DEFEND_REGEX = /^!(defend|defense|def)[\s]*$/i;
const MAP_LOAD_REGEX = /^!(map|maps|hexmap|hexmaps)[\s]+load=[A-Za-z0-9\,\.\_]+(\s)*$/i;
const MAP_SAVE_REGEX = /^!(map|maps|hexmap|hexmaps)[\s]+[A-Za-z0-9]+=([A-Za-z0-9\_\:\-\.]+[\,]*(\n)*)+((\s)+(players|characters)\=([A-Za-z0-9\.\_]+\|[A-Za-z0-9\.\_]+\|[0-9]+\:[0-9]+(\,)*)+)?$/i;
const MAP_MOVE_REGEX = /^!(move|mv|mov|moves)[\s]+[A-Za-z0-9\.\_]+[\s]+([A-Za-z0-9\.\_]+\|[0-9]+:[0-9]+(\s)*(\,)*)+$/i;
const MAP_SUMMON_REGEX = /^!(summon|sum)[\s]+[A-Za-z0-9\,\.\_]+[\s]+([A-Za-z0-9\.\_]+\|[A-Za-z0-9\.\_]+\|[0-9]+:[0-9]+(\s)*(\,)*)+$/i;

module.exports = {
    // Main logic flow to process commands
    processRPGCompanionCommand: async function(msg) {
        try {
            // If message starts with !, attempt to process it
            if (msg.content.startsWith('!')) {
                let originalMsg = msg.content;
                let msgAry = originalMsg.replace(/\s/g, '').split('');

                // Valid dice commands !r 2d6 +/- X, where X is some number
                if (originalMsg.startsWith('!r') &&  DICE_COMMAND_REGEX.test(originalMsg)) {
                    let response = await parseDiceCommandAndGetRoll(originalMsg, msgAry[2]);
                    if (response) {
                        msg.channel.send(response);
                    } else {
                        msg.channel.send('Unable to parse dice command with contents: ' + originalMsg);
                    }
                }

                if (originalMsg.startsWith('!map') &&  MAP_LOAD_REGEX.test(originalMsg)) {
                    parseCommandAndLoadMap(msg, originalMsg);
                } else if (originalMsg.startsWith('!map') &&  MAP_SAVE_REGEX.test(originalMsg)) {
                    parseCommandAndSaveMap(msg, originalMsg);
                } else if (originalMsg.startsWith('!move') &&  MAP_MOVE_REGEX.test(originalMsg)) {
                    parseCommandAndMovePlayerOnMap(msg, originalMsg);
                } else if (originalMsg.startsWith('!summon') &&  MAP_SUMMON_REGEX.test(originalMsg)) {
                    parseCommandAndSummonPlayerOnMap(msg, originalMsg);
                }

                // Valid create character commands !c fieldOne="value one" fieldTwo={name:"a1",attack:"a1"} fieldArray=[{name:"a",attack:"a"},{name:"b",attack:"b"}]
                var character = {};
                if (msgAry.length >= 7 && msgAry[1].toUpperCase() === 'U' && CREATE_COMMAND_REGEX.test(originalMsg)) {
                    fs.readFile(msg.author.username + '_character.json', 'utf8', function(err, data) {
                        if (!data) {
                            msg.channel.send('Unable to find character data...');
                            return;
                        }
                        character = JSON.parse(data)
                        character = parseContents(character, originalMsg)
                
                        let characterJson = JSON.stringify(character);
                        fs.writeFile(msg.author.username + '_character.json', characterJson, function (err) {
                            if (err){
                                return console.log(err);
                            }
                            console.log('Updated contents to ' + msg.author.username + '_characters.json...');
                        });
                        msg.channel.send('Processed update character: ' + characterJson);
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
                    msg.channel.send('Processed create character: ' + characterJson);
                } else if (msgAry.length == 2 && msgAry[1].toUpperCase() === 'D') {
                    character = parseContents(character, originalMsg)
                
                    let characterJson = JSON.stringify(character);
                    fs.unlinkSync(msg.author.username + '_character.json');
                    msg.channel.send('Processed delete character: ' + characterJson);
                } else if (msgAry.length == 2 && msgAry[1].toUpperCase() === 'S') {
                    fs.readFile(msg.author.username + '_character.json', 'utf8', function(err, data) {
                        if (!data) {
                            msg.channel.send('Unable to find character data...');
                            return;
                        }
                        character = JSON.parse(data)
                        let characterJson = JSON.stringify(character);
                        console.log('Reading contents to ' + msg.author.username + '_character.json...');
                        msg.channel.send('Processed read character: ' + characterJson);
                    });
                }

                // !c  attributes=[{name:"STR",value:"14",mod:"-4",isHitStat:"true"}] weapons=[{name:"Thor's Hammer",attack:"2d6"},{name:"Odin's Spear",attack:"d10 + 3"}]
                if (msgAry.length >= 2 && ATTACK_REGEX.test(originalMsg)) {

                    fs.readFile(msg.author.username + '_character.json', 'utf8', async function(err, data) {
                        if (!data) {
                            msg.channel.send('Unable to find character data...');
                            return;
                        }
                        character = JSON.parse(data);
                        if (character && character.weapons != null && character.weapons.length > 0) {
                            // Roll hit dice first and add modifier
                            let hitStatMod = 0;
                            if (character.attributes) {
                                for (let attribute of character.attributes) {
                                    if (attribute && attribute.isHitStat && !isNaN(attribute.mod)) {
                                        hitStatMod = parseInt(attribute.mod);
                                    }
                                }
                            }
                            rollHitDice(character, msg, hitStatMod);

                            for (let weapon of character.weapons) {
                                if (weapon && weapon.name && weapon.attack && DICE_REGEX.test(weapon.attack)) {
                                    // Expect a dice format of XdY +/- Z where X, Y, and Z are real numbers
                                    let weaponAttackStr = weapon.attack;
                                    let weaponAttackCharAry = weapon.attack.replace(/\s/g,'').split('');
                                    let response = await parseDiceCommandAndGetRoll(weaponAttackStr, weaponAttackCharAry[0]);
                                    if (response) {
                                        msg.channel.send('Attack ' + response);
                                    } else {
                                        msg.channel.send('Unable to parse weapon dice command with contents: ' + JSON.stringify(weapon));
                                    }
                                } else {
                                    msg.channel.send('Unable to find weapon...');
                                }
                            }
                        }
                    });
                }

                // !c system="2d20" attributes=[{name:"STR",value:"14",mod:"-4",isHitStat:"true"},{name:"AGI",value:"14",mod:"-2",isDefendStat:"true"}] armor=[{name:"Armor",defense:"3d4"}]
                if (msgAry.length >= 2 && DEFEND_REGEX.test(originalMsg)) {

                    fs.readFile(msg.author.username + '_character.json', 'utf8', async function(err, data) {
                        if (!data) {
                            msg.channel.send('Unable to find character data...');
                            return;
                        }
                        character = JSON.parse(data);
                        if (character && character.armor != null && character.armor.length > 0) {
                            // Roll hit dice first and add modifier
                            let defendStatMod = 0;
                            if (character.attributes) {
                                for (let attribute of character.attributes) {
                                    if (attribute && attribute.isDefendStat && !isNaN(attribute.mod)) {
                                        defendStatMod = parseInt(attribute.mod);
                                    }
                                }
                            }
                            rollHitDice(character, msg, defendStatMod);

                            for (let selectedArmor of character.armor) {
                                if (selectedArmor && selectedArmor.defense && DICE_REGEX.test(selectedArmor.defense)) {
                                    // Expect a dice format of XdY +/- Z where X, Y, and Z are real numbers
                                    let armorDefStr = selectedArmor.defense;
                                    let armorDefCharAry = selectedArmor.defense.replace(/\s/g,'').split('');
                                    let response = await parseDiceCommandAndGetRoll(armorDefStr, armorDefCharAry[0]);
                                    if (response) {
                                        msg.channel.send('Defend ' + response);
                                    } else {
                                        msg.channel.send('Unable to parse armor dice command with contents: ' + JSON.stringify(selectedArmor));
                                    }
                                } else {
                                    msg.channel.send('Unable to find armor...');
                                }
                            }
                        }
                    });
                }
            }
        } catch(err) {
            console.log('Unable to parse contents sent with exception message: ' + err);
        }
    }
};

let rollHitDice = async function(character, msg, hitStatMod) {
    if (character.system) {
        // Read in character.system field's dice format
        let chrSystem = character.system;
        let chrSystemCharAry = character.system.replace(/\s/g,'').split('');
        let hitRes = await parseDiceCommandAndGetRoll(chrSystem, chrSystemCharAry[0], hitStatMod);
        if (hitRes) {
            msg.channel.send('Hit ' + hitRes);
        } else {
            msg.channel.send('Unable to parse hit dice command with contents: ' + JSON.stringify(character.system));
        }
    } else {
        // Default is 1d20
        let hitRoll = await rollDice(20);
        msg.channel.send('Hit Roll (1d20): ' + hitRoll + ' mod ' + hitStatMod + ' equals ' + (hitRoll + hitStatMod));
    }
}

let parseContents = function(character, originalMsg) {
	let originalMsgAry = originalMsg.split(/[\"\}\]][\s]+|\![A-Za-z]\s/);
	for (let pos = 1; pos < originalMsgAry.length; pos++) {
		// Skip first position and start at 1
		let msgPart = originalMsgAry[pos];
		let parts = msgPart.split('\=');
		if (parts.length >= 2 && parts[1].startsWith('\"')) {
			// Is just value, string/int
			character[parts[0].trim()] = parts[1].replace(/\"/g, '');
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
			character[parts[0].trim()] = characterObj;
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
			character[parts[0].trim()] = characterObjAry;
		}
	}
	return character;
}

let parseDiceCommandAndGetRoll = async function(originalMsg, firstLetterInMsg, mod) {
    let response = null;
    let posOffset = 0;
    let originalMsgAry = originalMsg.split(' ');
    if (originalMsgAry.length >= 1 && originalMsgAry[0] != '!r') {
        // Is not a user command with !r
        posOffset = -1;
    }

    if (!mod) {
        mod = 0;
    }

    if (firstLetterInMsg.toUpperCase() === 'D') {
        // Has single dice roll
        let numberOfEdges = originalMsgAry[posOffset+1].replace(/[Dd]/g, '');
        let extraValue = mod;
        let operation = null;
        if (originalMsgAry.length >= 4 || (originalMsgAry.length >= 3 && posOffset < 0)) {
            extraValue += parseInt(originalMsgAry[posOffset+3]);
            operation = originalMsgAry[posOffset+2];
        }
        let roll = await rollDice(numberOfEdges);

        let extraValueStr = '';
        if ((originalMsgAry.length >= 4 || (originalMsgAry.length >= 3 && posOffset < 0)) && operation) {
            extraValueStr = getExtraValueStr(roll, extraValue, operation);
        } else if (mod != 0) {
            extraValueStr = ' mod ' + mod;
        }
        response = 'Roll (' + originalMsg + '): ' + roll + extraValueStr;
    } else if (!isNaN(firstLetterInMsg)) {
        // Has multiple dice rolls
        let edgesAndRolls = originalMsgAry[posOffset+1].replace(/!r/g, '').toUpperCase().split('D');
        let numberOfRolls = parseInt(edgesAndRolls[0]);
        let numberOfEdges = parseInt(edgesAndRolls[1]);
        let extraValue = 0;
        let operation = null;
        if (originalMsgAry.length >= 4 || (originalMsgAry.length >= 3 && posOffset < 0)) {
            extraValue += parseInt(originalMsgAry[posOffset+3]);
            operation = originalMsgAry[posOffset+2];
        }
        let total = 0;
        let finalMsg = '';
        for (let index = 0; index < numberOfRolls; index++) {	
            let roll = await rollDice(numberOfEdges);

            let extraValueStr = '';
            if ((originalMsgAry.length >= 4 || (originalMsgAry.length >= 3 && posOffset < 0)) && operation) {
                extraValueStr = getExtraValueStr(roll, extraValue, operation);
                total += getRollWithExtraAndOperator(roll, extraValue, operation);
            } else {
                total += roll;
            }
            finalMsg += '[' + roll + extraValueStr + '] ';
        }
        let modStr = '';
        if (mod != 0) {
            modStr = ' mod ' + mod;
        }
        response = 'Roll(s) (' + originalMsg + '): ' + finalMsg.trim() + modStr + ' with total: ' + (total + mod);
    }
    
    return response;
}

let rollDice = async function(numberOfEdges) {
    return await quantumRandom('uint16', 10, 10)
        .then(data => {
            let randomNumber = parseInt(data[0]);
            let randomNumberTwo = parseInt(data[1]);

            let roll = Math.floor((randomNumber + randomNumberTwo) % numberOfEdges) + 1;
            roll = parseInt(roll);
            return roll;
        })
        .catch(error => {
            console.error('Unable to read quantum numbers with error: ' + error);
            return rollPsuedoRandom(numberOfEdges);
        });
}

let rollPsuedoRandom = function(numberOfEdges) {
    let totalTimeInMS = new Date().getTime();
    let randomNumber = parseInt(Math.random());
    let randomNumberTwo = parseInt(Math.random());

    let roll = Math.floor(((totalTimeInMS * randomNumber) + randomNumberTwo) % numberOfEdges) + 1;
    roll = parseInt(roll);
    return roll;
}

let getExtraValueStr = function(roll, extraValue, operation) {

	let extraValueStr = '';
	if (operation === '+') {
		extraValueStr = ' + ' + extraValue + ' equals: ' + (roll + extraValue) ;
	} else if (operation === '-') {
		extraValueStr = ' - ' + extraValue + ' equals: ' + (roll - extraValue) ;
	} else if (operation === '/') {
		extraValueStr = ' / ' + extraValue + ' equals: ' + (roll * extraValue) ;
	} else if (operation === '*') {
		extraValueStr = ' * ' + extraValue + ' equals: ' + (roll / extraValue) ;
	}
	return extraValueStr;
}

let getRollWithExtraAndOperator = function(roll, extraValue, operation) {
	let result = 0;
	if (operation === '+') {
		result = (roll + extraValue);
	} else if (operation === '-') {
		result = (roll - extraValue);
	} else if (operation === '/') {
		result = (roll / extraValue);
	} else if (operation === '*') {
		result = (roll * extraValue);
	}
	return parseInt(result);
}

// !map testmap=green_square,green_square,green_square,green_square,green_square
// green_square,green_square,green_square,green_square,green_square
// green_square,green_square,green_square,green_square,green_square
// green_square,green_square,green_square,green_square,green_square
// green_square,green_square,green_square,green_square,green_square players=guard1|japanese_ogre|1:1,guard2|japanese_ogre|2:3
let parseCommandAndSaveMap = async function(msg, originalMsg) {
    let originalMsgAry = originalMsg.split(' ');
    // Part 1) !map 2) name=mapOfEmojis 3) players=guard1|img|1:1,guard2|img|1:1
    let mapParts = originalMsgAry[1].split('=');
    let name = mapParts[0];
    let mapDataRaw = mapParts[1];
    let mapDataRows = mapDataRaw.split('\n');

    let players = {};
    let playersToSave = {};
    if (originalMsgAry.length >= 3) {
        let playerParts = originalMsgAry[2].split('=');
        // guard1|img|1:1
        let playersArray = playerParts[1].split(',');
        for (let player of playersArray) {
            let playerParts = player.split('|');
            let name = playerParts[0];
            let emoji = playerParts[1];
            let xAndy = playerParts[2];
            players[xAndy] = {name: name, emoji: emoji, xy: xAndy};
            playersToSave[name] = {name: name, emoji: emoji, xy: xAndy};
        }
    }

    let jsonMapDataMtx = [];
    let rowCount = 0;
    for (let row of mapDataRows) {
        let mapDataColumns = row.split(',');
        let columnCount = 0;
        jsonMapDataMtx[rowCount] = [];
        for (let column of mapDataColumns) {
            jsonMapDataMtx[rowCount][columnCount] = column;
            columnCount++;
        }
        rowCount++;
    }

    // Load and save maps
    fs.readFile('maps.json', 'utf8', function(err, data) {
        let maps = {};
        if (data) {
            maps = JSON.parse(data);
            if (!maps) {
                maps = {};
            }
        }
        maps[name] = { players: playersToSave, map: jsonMapDataMtx };

        let mapsJson = JSON.stringify(maps);
        fs.writeFile('maps.json', mapsJson, function (err) {
            if (err){
                return console.log(err);
            }
            console.log('Updated contents to maps.json by ' + msg.author.username + '...');
        });
        msg.channel.send(displayMap(jsonMapDataMtx, players));
        
    });
}

let displayMap = function(mapsJson, players) {
    let mapToRender = '--';
    let columnCount = 0;
    for (let key in mapsJson) {
        let row = mapsJson[key];
        let rowCount = 0;   
        if (columnCount == 0) {
            // Add numbers
            let count = 0;
            mapToRender += '\t';
            for (let key in row) {
                if (count >= 9) {
                    mapToRender += count + '  ';
                } else {
                    mapToRender += count + '\t';
                }
                count++;
            }
            mapToRender += '\n';
        }

        if (columnCount == 1) {
            mapToRender += ' ';
        }
        if (columnCount > 9) {
            mapToRender += columnCount + '  ';
        } else {
            mapToRender += columnCount + '\t';
        }
        for (let key in row) {
            let value = row[key];
            let xAndy = columnCount + ":" + rowCount;
            let finalValue = value;
            if (players && players[xAndy]) {
                finalValue = players[xAndy].emoji;
            }
            mapToRender += ':' + finalValue + ':';
            rowCount++;
        }
        mapToRender += '\n';
        columnCount++;
    }
    return mapToRender;
}

let parseCommandAndLoadMap = async function(msg, originalMsg) {
    let originalMsgAry = originalMsg.split(' ');
    // Part 1) !map 2) load=name
    let nameParts = originalMsgAry[1].split('=');
    let name = nameParts[1];
    
    // Load and save maps
    fs.readFile('maps.json', 'utf8', function(err, data) {
        let maps = {};
        if (!data) {
            console.log('Unable to load map data for user: ' + msg.author.username);
            return;
        } else {
            maps = JSON.parse(data);
        }

        if (!maps[name]) {
            msg.channel.send('No map by the given name: ' + name);
        } else {
            msg.channel.send(displayMap(maps[name].map, maps[name].players));
        }
    });
}

let parseCommandAndMovePlayerOnMap = async function(msg, originalMsg) {
    let originalMsgAry = originalMsg.split(' ');
    // Part 1) !move 2) testmap 3)guard1|1:2,guard1|1:2
    let name = originalMsgAry[1];
    
    // Load and save maps
    fs.readFile('maps.json', 'utf8', function(err, data) {
        let maps = {};
        if (!data) {
            console.log('Unable to load map data for user: ' + msg.author.username);
            return;
        } else {
            maps = JSON.parse(data);
        }

        if (!maps[name]) {
            msg.channel.send('No map by the given name: ' + name);
        } else {
            let playersToUpdate = originalMsgAry[2].split(',');
            for (let player of playersToUpdate) {
                let playerParts = player.split('|');
                let playerName = playerParts[0];
                let xAndy = playerParts[1];
                let emoji = maps[name].players[playerName].emoji;
                maps[name].players[playerName] = {name: playerName, emoji: emoji, xy: xAndy};
            }

            let movedPlayers = {};
            for (let key in maps[name].players) {
                let player = maps[name].players[key];
                movedPlayers[player.xy] = player; 
            }

            maps[name] = { players: maps[name].players, map: maps[name].map};
            let mapsJson = JSON.stringify(maps);
            fs.writeFile('maps.json', mapsJson, function (err) {
                if (err){
                    return console.log(err);
                }
                console.log('Updated contents to maps.json by ' + msg.author.username + '...');
            });
            msg.channel.send(displayMap(maps[name].map, movedPlayers));
        }
    });
}

let parseCommandAndSummonPlayerOnMap = async function(msg, originalMsg) {
    let originalMsgAry = originalMsg.split(' ');
    // Part 1) !summon 2) testmap 3)guard1|emoji|1:2,guard1|emoji|1:2
    let name = originalMsgAry[1];
    
    // Load and save maps
    fs.readFile('maps.json', 'utf8', function(err, data) {
        let maps = {};
        if (!data) {
            console.log('Unable to load map data for user: ' + msg.author.username);
            return;
        } else {
            maps = JSON.parse(data);
        }

        if (!maps[name]) {
            msg.channel.send('No map by the given name: ' + name);
        } else {
            let playersToUpdate = originalMsgAry[2].split(',');
            for (let player of playersToUpdate) {
                let playerParts = player.split('|');
                let playerName = playerParts[0];
                let emoji = playerParts[1];
                let xAndy = playerParts[2];
                maps[name].players[playerName] = {name: playerName, emoji: emoji, xy: xAndy};
            }

            let movedPlayers = {};
            for (let key in maps[name].players) {
                let player = maps[name].players[key];
                movedPlayers[player.xy] = player; 
            }

            maps[name] = { players: maps[name].players, map: maps[name].map};
            let mapsJson = JSON.stringify(maps);
            fs.writeFile('maps.json', mapsJson, function (err) {
                if (err){
                    return console.log(err);
                }
                console.log('Updated contents to maps.json by ' + msg.author.username + '...');
            });
            msg.channel.send(displayMap(maps[name].map, movedPlayers));
        }
    });
}