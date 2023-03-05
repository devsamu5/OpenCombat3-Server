
const MechanicsData = require("./mechanics_data");

const SkillFactory = require("./skill_factory");

function fisherYatesShuffle(a){
    for(var i =a.length-1 ; i>0 ;i--){
        var j = Math.floor( Math.random() * (i + 1) );
        [a[i],a[j]]=[a[j],a[i]]; // swap
    }
}

class Player
{
	constructor(deck,hand_count,card_catalog,shuffle = true)
	{
		this.deck_list = [];

		this.hand = [];
		this.stock = [];
		this.played = [];
		this.discard = [];
		this.life = 0;

		this.states = [];

		this.playing_hand = [];
		this.select = -1;
		this.damage = 0;
		this.draw_indexes = [];
		this.select_card = null;
		this.effect_log = []


		this.deck_list.length = deck.length;
		this.stock.length = deck.length;
		for (let i = 0; i < deck.length;i++)
		{
			const c =  new MechanicsData.Card(card_catalog.get_card_data(deck[i]),i,new SkillFactory());
			this.deck_list[i] = c;
			this.stock[i] = i;
			this.life += c.data.level;
		}
		if (shuffle)
			fisherYatesShuffle(this.stock)
		for (let i = 0;i < hand_count;i++)
			this.draw_card();
	}

	get_deck_list(){return this.deck_list;}
	get_hand(){return this.hand;}
	get_played(){return this.played;}
	get_discard(){return this.discard;}

	get_stock_count(){return this.stock.length;}
	get_life(){return this.life;}
	get_states(){return this.states;}

	get_playing_hand(){return this.playing_hand;}
	get_select(){return this.select;}
	get_damage(){return this.damage;}
	get_draw(){return this.draw_indexes;}
	get_effect_log(){return this.effect_log;}

	combat_start(index)
	{
		this.playing_hand = [...this.hand]
		this.select = index;
		this.draw_indexes.length = 0;
		this.effect_log.length = 0;
		this.select_card = this.deck_list[this.hand.splice(index,1)[0]];
		this.life -= this.select_card.data.level;
	}

	get_playing_card(){return this.select_card;}
	get_link_color(){return this.played.length == 0 ? 0 : this.deck_list[this.played[this.played.length-1]].data.color;}

	get_current_power(){return this.select_card.get_current_power();}
	get_current_hit(){return this.select_card.get_current_hit();}
	get_current_block(){return this.select_card.get_current_block();}

	damage_is_fatal()
	{
		const total_damage = this.damage - this.get_current_block();
		this.damage = total_damage < 0 ? 0 : total_damage;
		return this.life <= this.damage
	}
	add_damage(d) {this.damage += d;}

	append_effect_log(index,timing,priority,data)
	{
		this.effect_log.push(new MechanicsData.EffectLog(index,timing,priority,data))
	}

	combat_end()
	{
		this.played.push(this.select_card.id_in_deck);
	}

	supply()
	{
		this.draw_card();
		if (this.damage > 0)
			this.draw_card();
	}
	recover(index)
	{
		this.playing_hand = [...this.hand]
		this.select = index;
		this.draw_indexes.length = 0;
		this.effect_log.length = 0;
		this.select_card = this.deck_list[this.hand[index]];
		this.discard_card(index);
		if (this.damage <= this.select_card.data.level)
		{
			this.damage = 0;
			return;
		}
		this.damage -= this.select_card.data.level;
		this.draw_card();
	}

	no_recover()
	{
		this.playing_hand = [...this.hand]
		this.select = -1;
		this.draw_indexes.length = 0;
		this.effect_log.length = 0;
	}
	
	is_recovery(){return this.damage == 0;}

	change_order(new_indexies)
	{
		if (new_indexies.length != this.hand.length)
			return false;
		for (let i = 0; i < this.hand.length;i++)
		{
			if (!new_indexies.includes(this.hand[i]))
				return false
		}
		for (let i = 0; i < this.hand.length;i++)
		{
			this.hand[i] = new_indexies[i]
		}
		return true
	}

	reset_select() {this.select = -1;this.select_card = null;}

	draw_card()
	{
		if (this.stock.length == 0)
			return -1;
		const id = this.stock.pop();
		this.hand.push(id);
		this.draw_indexes.push(id);
		return id;
	}
	discard_card(i)
	{
		const id = this.hand.splice(i,1)[0];
		this.life -= this.deck_list[id].data.level;
		this.discard.push(id);
		return id;
	}

	hand_to_deck_bottom(i)
	{
		const id = this.hand.splice(i,1)[0]
		this.stock.unshift(id)
	}


	output_json_string(time)
	{
		const effect_logs = [];
		this.effect_log.forEach((l)=>{
			effect_logs.push(`{"i":${l.index},"t":${l.timing},"p":${l.priority},"d":${JSON.stringify(l.data)}}`);
		});
		return `{"h":[${this.playing_hand.join(",")}],` +
			`"i":${this.select},` +
			`"e":[${effect_logs.join(",")}],` +
			`"dc":[${this.draw_indexes.join(",")}],` +
			`"d":${this.damage},` +
			`"l":${this.life},` +
			`"t":${time}}`;
	}

	 a = "Hola";
}

module.exports = Player;
