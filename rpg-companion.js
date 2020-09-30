/*
 * rpg-companion.js is designed to parse out and execute the commands for 
 * the RPGCompanion Discord Bot 
 *
 * @author Nathanial W. Heard
 */
// Imports
let fs = require('fs');


// Regex validation for commands
let DICE_COMMAND_REGEX = /^!r[\s]*[0-9]*[dD][0-9]+[\s]*[\+\-\*\/]?[\s]*[0-9]*[\s]*$/;
let CREATE_COMMAND_REGEX = /^![CcUuDdSs][\s]*([A-Za-z0-9]+=([0-9]*|\"[A-Za-z0-9\s\.\,\'\!\@\#\-\{\}\:\;\>\<\?\^\&\*\+\`\~]+\"[\s]*|\{([A-Za-z0-9]+:\"[A-Za-z0-9\s\.\,\'\!\@\#\-\>\<\?\^\&\*\+\`\~]+\"(\,?))+\}[\s]*|\[(\{([A-Za-z0-9]+:\"[A-Za-z0-9\s\.\,\'\!\@\#\-\>\<\?\^\&\*\+\`\~]+\"(\,)?)+\}(\,?))+\][\s]*)[\s]*)+$/;
let DICE_REGEX = /^[\s]*[0-9]*[dD][0-9]+[\s]*[\+\-\*\/]?[\s]*[0-9]*[\s]*$/;
let ATTACK_REGEX = /^!(attack|atk|attk)[\s]*$/i;
let DEFEND_REGEX = /^!(defend|defense|def)[\s]*$/i;
 
module.exports = {
    // Main logic flow to process commands
    processRPGCompanionCommand: function(msg) {
        try {
            // If message starts with !, attempt to process it
            if (msg.content.startsWith('!')) {
                let originalMsg = msg.content;
                let msgAry = originalMsg.replace(/\s/g, '').split('');

                // Valid dice commands !r 2d6 +/- X, where X is some number
                if (originalMsg.startsWith('!r') &&  DICE_COMMAND_REGEX.test(originalMsg)) {
                    let response = parseDiceCommandAndGetRoll(originalMsg, msgAry[2]);
                    if (response) {
                        msg.reply(response);
                    } else {
                        msg.reply('Unable to parse dice command with contents: ' + originalMsg);
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
                } else if (msgAry.length == 2 && msgAry[1].toUpperCase() === 'D') {
                    character = parseContents(character, originalMsg)
                
                    let characterJson = JSON.stringify(character);
                    fs.unlinkSync(msg.author.username + '_character.json');
                    msg.reply('Processed delete character: ' + characterJson);
                } else if (msgAry.length == 2 && msgAry[1].toUpperCase() === 'S') {
                    fs.readFile(msg.author.username + '_character.json', 'utf8', function(err, data) {
                        character = JSON.parse(data)
                        let characterJson = JSON.stringify(character);
                        console.log('Reading contents to ' + msg.author.username + '_character.json...');
                        msg.reply('Processed read character: ' + characterJson);
                    });
                }

                // !c  attributes=[{name:"STR",value:"14",mod:"-4",isHitStat:"true"}] weapons=[{name:"Thor's Hammer",attack:"2d6"},{name:"Odin's Spear",attack:"d10 + 3"}]
                if (msgAry.length >= 2 && ATTACK_REGEX.test(originalMsg)) {

                    fs.readFile(msg.author.username + '_character.json', 'utf8', function(err, data) {
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
                                    let response = parseDiceCommandAndGetRoll(weaponAttackStr, weaponAttackCharAry[0]);
                                    if (response) {
                                        msg.reply('Attack ' + response);
                                    } else {
                                        msg.reply('Unable to parse weapon dice command with contents: ' + JSON.stringify(weapon));
                                    }
                                } else {
                                    msg.reply('Unable to find weapon...');
                                }
                            }
                        }
                    });
                }

                // !c system="2d20" attributes=[{name:"STR",value:"14",mod:"-4",isHitStat:"true"},{name:"AGI",value:"14",mod:"-2",isDefendStat:"true"}] armor=[{name:"Armor",defense:"3d4"}]
                if (msgAry.length >= 2 && DEFEND_REGEX.test(originalMsg)) {

                    fs.readFile(msg.author.username + '_character.json', 'utf8', function(err, data) {
                        let character = JSON.parse(data);
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
                                    let response = parseDiceCommandAndGetRoll(armorDefStr, armorDefCharAry[0]);
                                    if (response) {
                                        msg.reply('Defend ' + response);
                                    } else {
                                        msg.reply('Unable to parse armor dice command with contents: ' + JSON.stringify(selectedArmor));
                                    }
                                } else {
                                    msg.reply('Unable to find armor...');
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

let rollHitDice = function(character, msg, hitStatMod) {
    if (character.system) {
        // Read in character.system field's dice format
        let chrSystem = character.system;
        let chrSystemCharAry = character.system.replace(/\s/g,'').split('');
        let hitRes = parseDiceCommandAndGetRoll(chrSystem, chrSystemCharAry[0], hitStatMod);
        if (hitRes) {
            msg.reply('Hit ' + hitRes);
        } else {
            msg.reply('Unable to parse hit dice command with contents: ' + JSON.stringify(character.system));
        }
    } else {
        // Default is 1d20
        let hitRoll = rollDice(20);
        msg.reply('Hit Roll (1d20): ' + hitRoll + ' mod ' + hitStatMod + ' equals ' + (hitRoll + hitStatMod));
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

let parseDiceCommandAndGetRoll = function(originalMsg, firstLetterInMsg, mod) {
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
        let roll = rollDice(numberOfEdges);

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
            let roll = rollDice(numberOfEdges);

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

let rollDice = function(numberOfEdges) {
	let totalTimeInMS = new Date().getTime();
	let randomNumber = Math.random();
	let randomNumberTwo = Math.random();
	let roll = Math.floor(((totalTimeInMS * randomNumber) + randomNumberTwo) % numberOfEdges) + 1;
	return parseInt(roll);			
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

let getCharacterMod = function(item, character) {
	if (character.attributes) {
		for (let attribute of character.attributes) {
			if (attribute.name && item.mod && attribute.name === item.mod) {
				let modValue = parseInt(attribute.mod);
				return modValue;
			}
		}
	}
	return 0;
}