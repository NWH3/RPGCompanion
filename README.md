## RPGCompanion
RPGCompanion is a Discord Bot designed to help players by simplifying some of the tedious actions. Once RPGCOmpanion has been installed on your Discord Server you will be able to roll dice, create character sheets, manage items, and perform character actions with dynamic results. 

## Tech Stack 
- NodeJS (v10.19.0)
- DotEnv (GitHub: https://github.com/motdotla/dotenv)
- DiscordJS (GitHub: https://github.com/discordjs/discord.js)
- qrandom (GitHub: https://github.com/mario-rggj/qrandom#readme)

## Build & Run
You will need to have npm and NodeJS version 10.18.0 or greater installed on your machine. Then run the following commands.

- Install all depdencies: npm install

- Run bot: node index.js

## RPGCompanion Commands:

- Roll Dice: !r YdX where Y and X are some real numbers, Examples: !r 1d6 or !r d6

- Roll Dice with Modifier: !r YdX operation Z where Y, X, and Z are some real numbers and operation is +, -, *, or /, Examples: !r 1d6 + 2 or !r d6 - 3
    - Note that the modifier is applied to each dice roll

- Create Character Sheet: !c fieldOne="some value here" fieldTwo={name:"name here",type:"with type"} fieldThree=[{name:"name",type"type"}]

- Update Character Sheet: !u fieldFour="some new value here"

- Delete Character Sheet: !d

- Show Character Sheet: !s

- Attack with character weapons: !attack X
    - Where X is some real number representing the mod to your hit rolls, will roll hit rolls for each weapon in the array
    - This command will roll your character's weapons after a hit dice roll is made, default 1d20
    - The hit dice can be changed by setting the character's system: !u system="2d20"
    - Note that the character sheet must have a weapons array in a similiar JSON array format:
    - Add weapons to character: !u weapons=[{name:"Thor's Hammer",attack:"2d6"},{name:"Odin's Spear",attack:"d10 + 3"}]

- Defend with character armor: !defend X Y 
    - Where X and Y are real numbers representing the mod to the hit rolls and the number of hit rolls respectively
    - Note that the character sheet must have a armor array in a similiar JSON array format:
    - The defend hit dice can be changed by setting the character's system: !u system="2d20"
    - Add armor to character: !u armor=[{name:"Thor's Hammer",defense:"3d4"},{name:"Odin's Spear",defense:"d8 + 1"}]

- Save, load, and update emoji battle maps (Word limit 2000 due to Discord, Custom emojis are still outstanding)
    - !map mapName=listOfEmojiTexts,listOfEmojiTexts,listOfEmojiTexts players=name|emojiText|x:y,name2|emojiText|x:y
    - !move mapName name|x:y
    - !summon mapName name|emojiText|x:y

## Author
Nathanial W. Heard