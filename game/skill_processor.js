
const Effect = require("./effect");
const Skill = require("./skill");
const Card = require("./card");
const Player = require("./player");


class ISkill
{
	before_priority(){return 0;}
	process_before(_skill,_myself,_rival){}

	engaged_priority(){return 0;}
	process_engaged(_skill,situation,_myself,_rival){return situation;}

	after_priority(){return 0;}
	process_after(_skill,_situation,_myself,_rival){}

	end_priority(){return 0;}
	process_end(_skill,_situation,_myself,_rival){}
}

class Reinforce extends ISkill
{
	before_priority(){return 1;}
	process_before(skill,myself,_rival)
	{
		const affected = myself.select_card.affected;
		skill.parameter.forEach(e => {
			switch(e.data.id)
			{
				case Effect.Attribute.POWER:
					affected.power += e.parameter;
					break;
				case Effect.Attribute.HIT:
					affected.hit += e.parameter;
					break;
				case Effect.Attribute.BLOCK:
					affected.block += e.parameter;
					break;
			}
		});
	}
}

class Rush extends ISkill
{
	after_priority(){return 1;}
	process_after(_skill,situation,_myself,rival)
	{
		if (situation > 0)
		{
			rival.add_damage(Math.floor((rival.get_current_block() + 1) / 2));
		}
	}
}

class Charge extends ISkill
{
	end_priority(){return 1;}
	process_end(skill,_situation,myself,_rival)
	{
		if (myself.damage == 0)
		{
			const affected = myself.next_effect;
			skill.parameter.forEach(e => {
				switch(e.data.id)
				{
					case Effect.Attribute.POWER:
						affected.power += e.parameter;
						break;
					case Effect.Attribute.HIT:
						affected.hit += e.parameter;
						break;
					case Effect.Attribute.BLOCK:
						affected.block += e.parameter;
						break;
				}
			});
		}
	}
}

class Isolate extends ISkill
{
	engaged_priority(){return 255;}
	process_engaged(_skill,_situation,myself,_rival)
	{
		myself.add_damage(1);
		return 0;
	}

}

module.exports.ISkill = ISkill;
module.exports.Reinforce = Reinforce;
module.exports.Rush = Rush;
module.exports.Charge = Charge;
module.exports.Isolate = Isolate;

