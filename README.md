## RPGCompanion
RPGCompanion is a Discord Bot designed to help players by simplifying some of the tedious actions. Once RPGCOmpanion has been installed on your Discord Server you will be able to roll dice, create character sheets, manage items, and perform character actions with dynamic results. 

Overview of commands:

- Roll Dice: !r YdX where Y and X are some real numbers, Examples: !r 1d6 or !r d6

- Roll Dice with Modifier: !r YdX operation Z where Y, X, and Z are some real numbers and operation is +, -, *, or /, Examples: !r 1d6 + 2 or !r d6 - 3
 - Note that the modifier is applied to each dice roll

- Create Character Sheet: !c fieldOne="some value here" fieldTwo={name:"name here",type:"with type"} fieldThree=[{name:"name",type"type"}]

- Update Character Sheet: !u fieldFour="some new value here"

- Delete Character Sheet: !d

- Show Character Sheet: !s

- Attack with character weapons: !attack
 - Will roll your character's weapons after a hit dice roll is made, default 1d20
 - The hit dice can be changed by setting the character's system: !u system="2d20"
 - Note that the character sheet must have a weapons array in a similiar JSON array format:
 - Add weapons to character: Iu weapons=[{name:"Thor's Hammer",attack:"2d6"},{name:"Odin's Spear",attack:"d10 + 3"}]
 - Add attributes to alter hit roll for character attack: !u attributes=[{name:"STR",value:"14",mod:"-4",isHitStat:"true"}] 

- Defend with character armor: !defend
 - Note that the character sheet must have a armor array in a similiar JSON array format:
 - The defend hit dice can be changed by setting the character's system: !u system="2d20"
 - Add armor to character: !u armor=[{name:"Thor's Hammer",defense:"3d4"},{name:"Odin's Spear",defense:"d8 + 1"}]
 - Add attributes to alter hit roll for character defend: !u attributes=[{name:"AGI",value:"14",mod:"-4",isDefendStat:"true"}] 

## Tech Stack 
- NodeJS 
- DotEnv
- DiscordJS (GitHub: https://github.com/discordjs/discord.js)

## Author
Nathanial W. Heard