
/*
 * Start class for the RPGComapnion Discord Bot which
 * configures the discord client with the rpg-companion libs
 *
 * @author Nathanial W. Heard
 */
// Imports
require('dotenv').config();
const rpgCompanion = require('./rpg-companion.js');
const Discord = require('discord.js');

// Create Discord client/bot
const client = new Discord.Client();

// Set on start messages for terminal
client.on('ready', () => {
	console.log('Starting application...');
  	console.log(`Logged in as ${client.user.tag}!`);
});
 
// Sets main logic for parsing and executing commands for specified Discord client
client.on('message', msg => {
	// If message starts with !, attempt to process it
	if (msg.content.startsWith('!')) {
		rpgCompanion.processRPGCompanionCommand(msg);
	}
}); 

// Start Discord Bot by logging in with secret token
client.login(process.env.SECRET);
