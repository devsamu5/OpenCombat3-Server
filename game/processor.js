
const Effect = require("./effect");
const Skill = require("./skill");
const Card = require("./card");
const Player = require("./player");

const catalog = require("./catalog");

const NamedSkill = require("./skill_processor")

const Phase = Object.freeze({
	GAME_FINISH:-1,
	COMBAT:0,
	RECOVERY:1,
});

class SkillOrder
{
	constructor(p,s,m,r,situ = 0)
    {
		this.priority = p
		this.skill = s
		this.myself = m
		this.rival = r
		this.situation = situ
    }
	static compare(a, b){return a.priority - b.priority;}
}

class GameProcessor
{
    static named_skills = [
		null,
		new NamedSkill.Reinforce(),
		new NamedSkill.Rush(),
		new NamedSkill.Charge(),
		new NamedSkill.Isolate(),
	];

    constructor(deck1,deck2,regulation)
    {
		this.round = 1;
        this.phase = Phase.COMBAT;
        this.player1 = new Player(deck1,4,catalog,true);
        this.player2 = new Player(deck2,4,catalog,true);
        this.situation = 0;
    }

	reorder_hand1(hand)
	{
		this.player1.reorder_hand(hand);
	}
	reorder_hand2(hand)
	{
		this.player2.reorder_hand(hand);
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

		this.player1.combat_fix_damage();
		this.player2.combat_fix_damage();

		if (this.player1.is_fatal() || this.player2.is_fatal())
		{
			this.phase = -Phase.GAME_FINISH;
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
			this.phase = -Phase.GAME_FINISH;
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
		this.player1.select_card.data.skills.forEach(e => {
			if (e.test_condition(this.player2.select_card.data.color,p1_link_color))
			{
				const priority = this.named_skills[s.data.id].before_priority();
				if (priority != 0)
					skill_order.push(new SkillOrder(priority,s,this.player1,this.player2))
			}
		});
		this.player2.select_card.data.skills.forEach(e => {
			if (e.test_condition(this.player1.select_card.data.color,p2_link_color))
			{
				const priority = this.named_skills[s.data.id].before_priority();
				if (priority != 0)
					skill_order.push(new SkillOrder(priority,s,this.player2,this.player1))
			}
		});
		skill_order.sort(SkillOrder.compare);
		skill_order.forEach(e => {
			this.named_skills[e.skill.data.id].process_before(e.skill,e.myself,e.rival)
		});
	}

	_engaged_process(p1_link_color, p2_link_color)
	{
		const skill_order = [];
		this.player1.select_card.data.skills.forEach(e => {
			if (e.test_condition(this.player2.select_card.data.color,p1_link_color))
			{
				const priority = this.named_skills[s.data.id].engaged_priority();
				if (priority != 0)
					skill_order.push(new SkillOrder(priority,s,this.player1,this.player2,this.situation))
			}
		});
		this.player2.select_card.data.skills.forEach(e => {
			if (e.test_condition(this.player1.select_card.data.color,p2_link_color))
			{
				const priority = this.named_skills[s.data.id].engaged_priority();
				if (priority != 0)
					skill_order.push(new SkillOrder(priority,s,this.player2,this.player1,-this.situation))
			}
		});
		skill_order.sort(SkillOrder.compare);
		skill_order.forEach(e => {
			this.situation = this.named_skills[e.skill.data.id].process_engaged(e.skill,e.situation,e.myself,e.rival)
		});
	}

	_after_process(p1_link_color, p2_link_color)
	{
		const skill_order = [];
		this.player1.select_card.data.skills.forEach(e => {
			if (e.test_condition(this.player2.select_card.data.color,p1_link_color))
			{
				const priority = this.named_skills[s.data.id].after_priority();
				if (priority != 0)
					skill_order.push(new SkillOrder(priority,s,this.player1,this.player2,this.situation))
			}
		});
		this.player2.select_card.data.skills.forEach(e => {
			if (e.test_condition(this.player1.select_card.data.color,p2_link_color))
			{
				const priority = this.named_skills[s.data.id].after_priority();
				if (priority != 0)
					skill_order.push(new SkillOrder(priority,s,this.player2,this.player1,-this.situation))
			}
		});
		skill_order.sort(SkillOrder.compare);
		skill_order.forEach(e => {
			this.situation = this.named_skills[e.skill.data.id].process_after(e.skill,e.situation,e.myself,e.rival)
		});
	}

	_end_process(p1_link_color, p2_link_color)
	{
		const skill_order = [];
		this.player1.select_card.data.skills.forEach(e => {
			if (e.test_condition(this.player2.select_card.data.color,p1_link_color))
			{
				const priority = this.named_skills[s.data.id].end_priority();
				if (priority != 0)
					skill_order.push(new SkillOrder(priority,s,this.player1,this.player2,this.situation))
			}
		});
		this.player2.select_card.data.skills.forEach(e => {
			if (e.test_condition(this.player1.select_card.data.color,p2_link_color))
			{
				const priority = this.named_skills[s.data.id].end_priority();
				if (priority != 0)
					skill_order.push(new SkillOrder(priority,s,this.player2,this.player1,-this.situation))
			}
		});
		skill_order.sort(SkillOrder.compare);
		skill_order.forEach(e => {
			this.situation = this.named_skills[e.skill.data.id].process_end(e.skill,e.situation,e.myself,e.rival)
		});
	}

}

module.exports = GameProcessor;

