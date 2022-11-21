
const Effect = require("./effect");
const Skill = require("./skill");
const Card = require("./card");
const Player = require("./player");


const SkillTiming = Object.freeze({
	BEFORE:0,
	ENGAGED:1,
	AFTER:2,
	END:3
});

class ISkill
{
	before_priority(){return [];}
	process_before(_skill_index,_priority,_myself,_rival){}

	engaged_priority(){return [];}
	process_engaged(_skill_index,_priority,situation,_myself,_rival){return situation;}

	after_priority(){return [];}
	process_after(_skill_index,_priority,_situation,_myself,_rival){}

	end_priority(){return [];}
	process_end(_skill_index,_priority,_situation,_myself,_rival){}
}

class Reinforce extends ISkill
{
	before_priority(){return [1];}
	process_before(skill_index,_priority,myself,_rival)
	{
		const skill = myself.select_card.data.skills[skill_index]
		const affected = myself.select_card.affected;
		skill.parameter[0].forEach(e => {
			switch(e.data.id)
			{
				case Effect.Attribute.POWER:
					affected.add(e.parameter,0,0);
					break;
				case Effect.Attribute.HIT:
					affected.add(0,e.parameter,0);
					break;
				case Effect.Attribute.BLOCK:
					affected.add(0,0,e.parameter);
					break;
			}
		});
		myself.skill_log.push(new Player.SkillLog(skill_index,SkillTiming.BEFORE,1,true))
	}
}

class Pierce extends ISkill
{
	after_priority(){return [1];}
	process_after(skill_index,_priority,situation,myself,rival)
	{
		let damage = 0;
		if (situation > 0)
		{
			damage = Math.floor((rival.get_current_block() + 1) / 2);
			rival.add_damage(damage);
		}
		myself.skill_log.push(new Player.SkillLog(skill_index,SkillTiming.AFTER,1,damage))
	}
}

class Charge extends ISkill
{
	end_priority(){return [1];}
	process_end(skill_index,_priority,_situation,myself,_rival)
	{
		if (myself.damage == 0)
		{
			const skill = myself.select_card.data.skills[skill_index]
			const affected = myself.next_effect;
			skill.parameter[0].forEach(e => {
				switch(e.data.id)
				{
					case Effect.Attribute.POWER:
						affected.add(e.parameter,0,0);
						break;
					case Effect.Attribute.HIT:
						affected.add(0,e.parameter,0);
						break;
					case Effect.Attribute.BLOCK:
						affected.add(0,0,e.parameter);
						break;
				}
			});
			myself.skill_log.push(new Player.SkillLog(skill_index,SkillTiming.END,1,true))
		}
		else
			myself.skill_log.push(new Player.SkillLog(skill_index,SkillTiming.END,1,false))
	}
}

class Isolate extends ISkill
{
	engaged_priority(){return [255];}
	process_engaged(skill_index,_priority,_situation,myself,_rival)
	{
		myself.add_damage(1);
		myself.skill_log.push(new Player.SkillLog(skill_index,SkillTiming.ENGAGED,255,true))
		return 0;
	}
}

class Absorb extends ISkill
{
	before_priority(){return [1];}
	process_before(skill_index,_priority,myself,_rival)
	{
		const skill = myself.select_card.data.skills[skill_index]

		let level = 0
		let data = []
		for (let i = 0;i < myself.hand.length;i++)
		{
			const card = myself.deck_list[myself.hand[i]]
			if (card.data.color == skill.parameter[0])
			{
				level = card.data.level
				myself.discard_card(i)
				const draw_index = myself.skill_draw_card()
				data = [i,draw_index]
				break
			}
		}
		const affected = myself.select_card.affected;
		skill.parameter[1].forEach(e => {
			switch(e.data.id)
			{
				case Effect.Attribute.POWER:
					affected.add(e.parameter * level,0,0);
					break;
				case Effect.Attribute.HIT:
					affected.add(0,e.parameter * level,0);
					break;
				case Effect.Attribute.BLOCK:
					affected.add(0,0,e.parameter * level);
					break;
			}
		});
		myself.skill_log.push(new Player.SkillLog(skill_index,SkillTiming.BEFORE,1,data))
	}
}

module.exports.ISkill = ISkill;
module.exports.Reinforce = Reinforce;
module.exports.Pierce = Pierce;
module.exports.Charge = Charge;
module.exports.Isolate = Isolate;
module.exports.Absorb = Absorb;

