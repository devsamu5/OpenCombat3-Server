
const MechanicsData = require("./mechanics_data");
const Player = require("./player");

const catalog = require("./catalog");

const Phase = Object.freeze({
	GAME_END:-1,
	COMBAT:0,
	RECOVERY:1,
});

class EffectOrder
{
	constructor(e,p,i,m,r,s = 0,sign = 0)
    {
		this.effect = e
		this.priority = p;
		this.index = i;
		this.myself = m;
		this.rival = r;
		this.situation = s;
		this.sign = sign;
    }
	static compare(a, b){return a.priority - b.priority;}
}


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
		if (this.phase != Phase.COMBAT)
			return;

		index1 = Math.min(Math.max(0, index1), this.player1.get_hand().length - 1);
		index2 = Math.min(Math.max(0, index2), this.player2.get_hand().length - 1);

		const p1_link_color = this.player1.get_link_color();
		const p2_link_color = this.player2.get_link_color();
		this.player1.combat_start(index1);
		this.player2.combat_start(index2);

		this._before_process(p1_link_color,p2_link_color);

		this.situation = this.player1.get_current_power() - this.player2.get_current_power();

		this._engaged_process(p1_link_color,p2_link_color);

		if (this.situation > 0)
		{
			this.player2.add_damage(this.player1.get_current_hit());
		}
		else if (this.situation < 0)
		{
			this.player1.add_damage(this.player2.get_current_hit());
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

		this.player1.supply();
		this.player2.supply();
		if (this.player1.is_recovery() && this.player2.is_recovery())
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
			this.player1.recover(index1);
		if (this.player2.is_recovery())
			this.player2.no_recover();
		else
			this.player2.recover(index2);
			
		if (this.player1.is_recovery() && this.player2.is_recovery())
		{
			this.round++;
			this.phase = Phase.COMBAT;
		}
		else if ((!this.player1.is_recovery() && (this.player1.get_hand().length + this.player1.get_stock_count() <= 1)) ||
				 (!this.player2.is_recovery() && (this.player2.get_hand().length + this.player2.get_stock_count() <= 1)))
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
		const effect_order = [];

		this.player1.get_states().forEach((s,i) => {
			const priority = s._before_priority();
			priority.forEach((p)=>{effect_order.push(new EffectOrder(s,p,-(i+1),this.player1,this.player2));});
		});
		this.player2.get_states().forEach((s,i) => {
			const priority = s._before_priority();
			priority.forEach((p)=>{effect_order.push(new EffectOrder(s,p,-(i+1),this.player2,this.player1));});
		});

		this.player1.get_playing_card().skills.forEach((s,i) => {
			if (s._get_skill().test_condition(this.player2.get_playing_card().data.color,p1_link_color))
			{
				const priority = s._before_priority();
				priority.forEach((p)=>{effect_order.push(new EffectOrder(s,p,i,this.player1,this.player2))});
			}
		});
		this.player2.get_playing_card().skills.forEach((s,i) => {
			if (s._get_skill().test_condition(this.player1.get_playing_card().data.color,p2_link_color))
			{
				const priority = s._before_priority();
				priority.forEach((p)=>{effect_order.push(new EffectOrder(s,p,i,this.player2,this.player1))});
			}
		});
		effect_order.sort(EffectOrder.compare);
		effect_order.forEach(e => {
			e.effect._process_before(e.index,e.priority,e.myself,e.rival)
		});
	}

	_engaged_process(p1_link_color, p2_link_color)
	{
		const effect_order = [];

		this.player1.get_states().forEach((s,i) => {
			const priority = s._engaged_priority();
			priority.forEach((p)=>{effect_order.push(new EffectOrder(s,p,-(i+1),this.player1,this.player2,this.situation,1));});
		});
		this.player2.get_states().forEach((s,i) => {
			const priority = s._engaged_priority();
			priority.forEach((p)=>{effect_order.push(new EffectOrder(s,p,-(i+1),this.player2,this.player1,-this.situation,-1));});
		});

		this.player1.get_playing_card().skills.forEach((s,i) => {
			if (s._get_skill().test_condition(this.player2.get_playing_card().data.color,p1_link_color))
			{
				const priority = s._engaged_priority();
				priority.forEach((p)=>{effect_order.push(new EffectOrder(s,p,i,this.player1,this.player2,this.situation,1))});
			}
		});
		this.player2.get_playing_card().skills.forEach((s,i) => {
			if (s._get_skill().test_condition(this.player1.get_playing_card().data.color,p2_link_color))
			{
				const priority = s._engaged_priority();
				priority.forEach((p)=>{effect_order.push(new EffectOrder(s,p,i,this.player2,this.player1,-this.situation,-1))});
			}
		});
		effect_order.sort(EffectOrder.compare);
		effect_order.forEach(e => {
			this.situation = e.effect._process_engaged(e.index,e.priority,e.situation,e.myself,e.rival) * e.sign;
		});
	}

	_after_process(p1_link_color, p2_link_color)
	{
		const effect_order = [];

		this.player1.get_states().forEach((s,i) => {
			const priority = s._after_priority();
			priority.forEach((p)=>{effect_order.push(new EffectOrder(s,p,-(i+1),this.player1,this.player2,this.situation));});
		});
		this.player2.get_states().forEach((s,i) => {
			const priority = s._after_priority();
			priority.forEach((p)=>{effect_order.push(new EffectOrder(s,p,-(i+1),this.player2,this.player1,-this.situation));});
		});

		this.player1.get_playing_card().skills.forEach((s,i) => {
			if (s._get_skill().test_condition(this.player2.get_playing_card().data.color,p1_link_color))
			{
				const priority = s._after_priority();
				priority.forEach((p)=>{effect_order.push(new EffectOrder(s,p,i,this.player1,this.player2,this.situation))});
			}
		});
		this.player2.get_playing_card().skills.forEach((s,i) => {
			if (s._get_skill().test_condition(this.player1.get_playing_card().data.color,p2_link_color))
			{
				const priority = s._after_priority();
				priority.forEach((p)=>{effect_order.push(new EffectOrder(s,p,i,this.player2,this.player1,-this.situation))});
			}
		});
		effect_order.sort(EffectOrder.compare);
		effect_order.forEach(e => {
			e.effect._process_after(e.index,e.priority,e.situation,e.myself,e.rival);
		});
	}

	_end_process(p1_link_color, p2_link_color)
	{
		const effect_order = [];

		this.player1.get_states().forEach((s,i) => {
			const priority = s._end_priority();
			priority.forEach((p)=>{effect_order.push(new EffectOrder(s,p,-(i+1),this.player1,this.player2,this.situation));});
		});
		this.player2.get_states().forEach((s,i) => {
			const priority = s._end_priority();
			priority.forEach((p)=>{effect_order.push(new EffectOrder(s,p,-(i+1),this.player2,this.player1,-this.situation));});
		});

		this.player1.get_playing_card().skills.forEach((s,i) => {
			if (s._get_skill().test_condition(this.player2.get_playing_card().data.color,p1_link_color))
			{
				const priority = s._end_priority();
				priority.forEach((p)=>{effect_order.push(new EffectOrder(s,p,i,this.player1,this.player2,this.situation))});
			}
		});
		this.player2.get_playing_card().skills.forEach((s,i) => {
			if (s._get_skill().test_condition(this.player1.get_playing_card().data.color,p2_link_color))
			{
				const priority = s._end_priority();
				priority.forEach((p)=>{effect_order.push(new EffectOrder(s,p,i,this.player2,this.player1,-this.situation))});
			}
		});
		effect_order.sort(EffectOrder.compare);
		effect_order.forEach(e => {
			e.effect._process_end(e.index,e.priority,e.situation,e.myself,e.rival);
		});
	}

}

module.exports = GameProcessor;

