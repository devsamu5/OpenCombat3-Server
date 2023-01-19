
const CatalogData = require("./catalog_data");
const MechanicsData = require("./mechanics_data");
const Player = require("./player");

const StateProcessor = require("./state_processor");


const Timing = MechanicsData.EffectTiming;


class Reinforce extends MechanicsData.BasicSkill
{
    static get PRIORITY() {return 1;}

	_before_priority(){return [Reinforce.PRIORITY];}
	_process_before(index,_priority,myself,_rival)
	{
		const affected = myself.select_card.affected
		var stats = this._skill.parameter[0]
		affected.power += stats.power
		affected.hit += stats.hit
		affected.block += stats.block
		myself.append_effect_log(index,Timing.BEFORE,Reinforce.PRIORITY,true)
	}
}

class Pierce extends MechanicsData.BasicSkill
{
	_after_priority(){return [1];}
	_process_after(index,_priority,situation,myself,rival)
	{
		let damage = 0;
		if (situation > 0)
		{
			damage = Math.floor((rival.get_current_block() + 1) / 2);
			rival.add_damage(damage);
		}
		myself.append_effect_log(index,Timing.AFTER,1,damage);
	}
}

class Charge extends MechanicsData.BasicSkill
{
	_end_priority(){return [1];}
	_process_end(index,_priority,_situation,myself,_rival)
	{
		if (myself.is_recovery())
		{
			const stats = this._skill.parameter[0];
			const _state = new StateProcessor.NextPlus(stats,myself.get_states());
			myself.append_effect_log(index,Timing.END,1,true);
		}
		else
		{
			myself.append_effect_log(index,Timing.END,1,false);
		}
	}
}

class Isolate extends MechanicsData.BasicSkill
{
	_engaged_priority(){return [255];}
	_process_engaged(index,_priority,_situation,myself,_rival)
	{
		myself.add_damage(1);
		myself.append_effect_log(index,Timing.ENGAGED,255,true);
		return 0;
	}
}

class Absorb extends MechanicsData.BasicSkill
{
	_before_priority(){return [1];}
	_process_before(index,_priority,myself,_rival)
	{
		let level = 0
		let data = -1
		for (let i = 0;i < myself.hand.length;i++)
		{
			const card = myself.deck_list[myself.hand[i]]
			if (card.data.color == this._skill.parameter[0])
			{
				level = card.data.level
				myself.discard_card(i)
				myself.draw_card()
				data = i
				break
			}
		}
		const affected = myself.get_playing_card().affected
		const effect = this._skill.parameter[1]
		affected.power += effect.power * level
		affected.hit += effect.hit * level
		affected.block += effect.block * level
		myself.append_effect_log(index,Timing.BEFORE,1,data);
	}
}

module.exports.Reinforce = Reinforce;
module.exports.Pierce = Pierce;
module.exports.Charge = Charge;
module.exports.Isolate = Isolate;
module.exports.Absorb = Absorb;

