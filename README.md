## RPGCompanion
RPGCompanion is a Discord Bot designed to help players by simplifying some of the tedious actions. Once RPGCOmpanion has been installed on your Discord Server you will be able to roll dice, create character sheets, manage items, and perform character actions with dynamic results. 

Overview of commands:

- Roll Dice: !r YdX where Y and X are some real numbers, Examples: !r 1d6 or !r d6

- Roll Dice with Modifier: !r YdX operation Z where Y, X, and Z are some real numbers and operation is +, -, *, or /, Examples: !r 1d6 + 2 or !r d6 - 3

- Create Character Sheet: !c fieldOne="some value here" fieldTwo={name:"name here",type:"with type"} fieldThree=[{name:"name",type"type"}]

- Update Character Sheet: !u fieldFour="some new value here"

- Delete Character Sheet: !d

- Show Character Sheet: !s

- Attack with character weapons: !attack
-- Note that the character sheet must have a weapons array in a similiar JSON array format:
-- weapons=[{name:"Thor's Hammer",attack:"2d6"},{name:"Odin's Spear",attack:"d10 + 3"}]

- Defend with character armor: !defend
-- Note that the character sheet must have a armor array in a similiar JSON array format:
-- armor=[{name:"Thor's Hammer",defense:"3d4"},{name:"Odin's Spear",defense:"d8 + 1"}]

## Tech Stack 
- NodeJS 
- DotEnv
- DiscordJS (GitHub: https://github.com/discordjs/discord.js)

## Author
Nathanial W. Heard