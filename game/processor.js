
const Effect = require("./effect");
const Skill = require("./skill");
const Card = require("./card");
const Player = require("./player");

const catalog = require("./catalog");

const NamedSkill = require("./skill_processor")

const Phase = Object.freeze({
	GAME_END:-1,
	COMBAT:0,
	RECOVERY:1,
});

class SkillOrder
{
	constructor(p,i,m,r,situ = 0,sign = 0)
    {
		this.priority = p;
		this.skill_index = i;
		this.myself = m;
		this.rival = r;
		this.situation = situ;
		this.sign = sign;
    }
	static compare(a, b){return a.priority - b.priority;}
}

const named_skills = [
	null,
	new NamedSkill.Reinforce(),
	new NamedSkill.Pierce(),
	new NamedSkill.Charge(),
	new NamedSkill.Isolate(),
	new NamedSkill.Absorb(),
];

class GameProcessor
{
    constructor(deck1,deck2,hand_count)
    {
		this.round = 1;
        this.phase = Phase.COMBAT;
        this.player1 = new Player(deck1,hand_count,catalog,true);
        this.player2 = new Player(deck2,hand_count,catalog,true);
        this.situation = 0;
    }

	reorder_hand1(hand)
	{
		this.player1.change_order(hand);
	}
	reorder_hand2(hand)
	{
		this.player2.change_order(hand);
	}

	combat(index1,index2)
	{
		index1 = Math.min(Math.max(0, index1), this.player1.hand.length - 1);
		index2 = Math.min(Math.max(0, index2), this.player2.hand.length - 1);

		const link1 = this.player1.get_lastplayed_card();
		const link2 = this.player2.get_lastplayed_card();
		const p1_link_color = (link1 == null) ? 0 : link1.data.color;
		const p2_link_color = (link2 == null) ? 0 : link2.data.color;
		this.player1.combat_start(index1);
		this.player2.combat_start(index2);

		this._before_process(p1_link_color,p2_link_color);

		this.situation = this.player1.get_current_power() - this.player2.get_current_power();

		this._engaged_process(p1_link_color,p2_link_color);

		if (this.situation > 0)
		{
			this.player2.damage = this.player1.get_current_hit();
		}
		else if (this.situation < 0)
		{
			this.player1.damage = this.player2.get_current_hit();
		}

		this._after_process(p1_link_color,p2_link_color);

		const p1fatal = this.player1.damage_is_fatal();
		const p2fatal = this.player2.damage_is_fatal();
	
		if (p1fatal || p2fatal)
		{
			this.phase = Phase.GAME_END;
			return;
		}

		this._end_process(p1_link_color,p2_link_color);

		this.player1.combat_end();
		this.player2.combat_end();

		if (this.player1.damage == 0 && this.player2.damage == 0)
		{
			this.round++;
			return;
		}
		this.phase = Phase.RECOVERY;
	}

	recover(index1,index2)
	{
		if (this.player1.is_recovery())
			this.player1.no_recover();
		else
			(this.player1.recover(index1))
		if (this.player2.is_recovery())
			this.player2.no_recover();
		else
			this.player2.recover(index2);
			
		if (this.player1.is_recovery() && this.player2.is_recovery())
		{
			this.round++;
			this.phase = Phase.COMBAT;
		}
		else if ((!this.player1.is_recovery() && (this.player1.hand.length + this.player1.stock.length <= 1)) ||
				 (!this.player2.is_recovery() && (this.player2.hand.length + this.player2.stock.length <= 1)))
		{
			this.phase = Phase.GAME_END;
		}
	}

	reset_select()
	{
		this.player1.reset_select()
		this.player2.reset_select()
	}

	_before_process(p1_link_color, p2_link_color)
	{
		const skill_order = [];
		this.player1.select_card.data.skills.forEach((s,i) => {
			if (s.test_condition(this.player2.select_card.data.color,p1_link_color))
			{
				const priority = named_skills[s.data.id].before_priority();
				priority.forEach((p)=>{skill_order.push(new SkillOrder(p,i,this.player1,this.player2))});
			}
		});
		this.player2.select_card.data.skills.forEach((s,i) => {
			if (s.test_condition(this.player1.select_card.data.color,p2_link_color))
			{
				const priority = named_skills[s.data.id].before_priority();
				priority.forEach((p)=>{skill_order.push(new SkillOrder(p,i,this.player2,this.player1))});
			}
		});
		skill_order.sort(SkillOrder.compare);
		skill_order.forEach(e => {
			const skill = e.myself.select_card.data.skills[e.skill_index]
			named_skills[skill.data.id].process_before(e.skill_index,e.priority,e.myself,e.rival)
		});
	}

	_engaged_process(p1_link_color, p2_link_color)
	{
		const skill_order = [];
		this.player1.select_card.data.skills.forEach((s,i) => {
			if (s.test_condition(this.player2.select_card.data.color,p1_link_color))
			{
				const priority = named_skills[s.data.id].engaged_priority();
				priority.forEach((p)=>{skill_order.push(new SkillOrder(p,i,this.player1,this.player2,this.situation,1))});
			}
		});
		this.player2.select_card.data.skills.forEach((s,i) => {
			if (s.test_condition(this.player1.select_card.data.color,p2_link_color))
			{
				const priority = named_skills[s.data.id].engaged_priority();
				priority.forEach((p)=>{skill_order.push(new SkillOrder(p,i,this.player2,this.player1,-this.situation,-1))});
			}
		});
		skill_order.sort(SkillOrder.compare);
		skill_order.forEach(e => {
			const skill = e.myself.select_card.data.skills[e.skill_index]
			this.situation = named_skills[skill.data.id].process_engaged(e.skill_index,e.priority,e.situation,e.myself,e.rival) * e.sign;
		});
	}

	_after_process(p1_link_color, p2_link_color)
	{
		const skill_order = [];
		this.player1.select_card.data.skills.forEach((s,i) => {
			if (s.test_condition(this.player2.select_card.data.color,p1_link_color))
			{
				const priority = named_skills[s.data.id].after_priority();
				priority.forEach((p)=>{skill_order.push(new SkillOrder(p,i,this.player1,this.player2,this.situation))});
			}
		});
		this.player2.select_card.data.skills.forEach((s,i) => {
			if (s.test_condition(this.player1.select_card.data.color,p2_link_color))
			{
				const priority = named_skills[s.data.id].after_priority();
				priority.forEach((p)=>{skill_order.push(new SkillOrder(p,i,this.player2,this.player1,-this.situation))});
			}
		});
		skill_order.sort(SkillOrder.compare);
		skill_order.forEach(e => {
			const skill = e.myself.select_card.data.skills[e.skill_index]
			named_skills[skill.data.id].process_after(e.skill_index,e.priority,e.situation,e.myself,e.rival)
		});
	}

	_end_process(p1_link_color, p2_link_color)
	{
		const skill_order = [];
		this.player1.select_card.data.skills.forEach((s,i) => {
			if (s.test_condition(this.player2.select_card.data.color,p1_link_color))
			{
				const priority = named_skills[s.data.id].end_priority();
				priority.forEach((p)=>{skill_order.push(new SkillOrder(p,i,this.player1,this.player2,this.situation))});
			}
		});
		this.player2.select_card.data.skills.forEach((s,i) => {
			if (s.test_condition(this.player1.select_card.data.color,p2_link_color))
			{
				const priority = named_skills[s.data.id].end_priority();
				priority.forEach((p)=>{skill_order.push(new SkillOrder(p,i,this.player2,this.player1,-this.situation))});
			}
		});
		skill_order.sort(SkillOrder.compare);
		skill_order.forEach(e => {
			const skill = e.myself.select_card.data.skills[e.skill_index]
			named_skills[skill.data.id].process_end(e.skill_index,e.priority,e.situation,e.myself,e.rival)
		});
	}

}

module.exports = GameProcessor;

