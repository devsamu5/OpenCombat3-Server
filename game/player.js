
const Card = require("./card");

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

		this.next_effect = new Card.Affected()
		this.select = -1;
		this.damage = 0;
		this.draw_indexes = [];
		this.select_card = null;

		this.multiply_power = 1.0;
		this.multiply_hit = 1.0;
		this.multiply_block = 1.0;

		this.deck_list.length = deck.length;
		this.stock.length = deck.length;
		for (let i = 0; i < deck.length;i++)
		{
			const c =  new Card.Card(card_catalog.get_card_data(deck[i]),i);
			this.deck_list[i] = c;
			this.stock[i] = i;
			this.life += c.data.level;
		}
		if (shuffle)
			fisherYatesShuffle(this.stock)
		for (let i = 0;i < hand_count;i++)
			this.draw_card();
	}

	get_hand_card(index){return this.deck_list[this.hand[index]];}
	get_lastplayed_card(){return this.played.empty() ? null : this.deck_list[this.played[this.played.length-1]];}

	combat_start(index)
	{
		this.select = index;
		this.draw_indexes.clear();
		this.deck_list.forEach((v)=>{
			v.affected.reset_update();
		});
		this.select_card = deck_list[hand.pop_at(i)];
		this.life -= select_card.data.level;
		this.select_card.affected.add_other(this.next_effect);
		this.next_effect.reset();
		this.multiply_power = 1.0;
		this.multiply_hit = 1.0;
		this.multiply_block = 1.0;
		return;
	}

	get_current_power(){return int(this.select_card.get_current_power() * this.multiply_power);}
	get_current_hit(){return int(this.select_card.get_current_hit() * this.multiply_hit);}
	get_current_block(){return int(this.select_card.get_current_block() * this.multiply_block);}

	combat_fix_damage()
	{
		const total_damage = this.damage - this.get_current_block();
		this.damage = total_damage < 0 ? 0 : total_damage;
	}

	combat_end()
	{
		this.played.push(this.select_card.id_in_deck);

		this.draw_card();
		if (this.damage > 0)
			this.draw_card();
	}
	add_damage(d) {this.damage += d;}

	is_fatal(){return (this.life - this.damage) <= 0;}

	recover(index)
	{
		this.select = index;
		this.draw_indexes.clear();
		this.select_card = this.deck_list[hand[index]];
		const id = this.discard_card(index);
		const card = this.deck_list[id];
		if (this.damage <= card.data.level)
		{
			this.damage = 0;
			return;
		}
		this.damage -= card.data.level;
		this.draw_card();
	}

	no_recover()
	{
		this.select = -1
		this.draw_indexes.clear()
	}
	
	is_recovery(){return this.damage == 0;}

	reorder_hand(new_indexies)
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


	output_json_string()
	{
		const hand = Array.from(this.hand);
		hand.splice(this.player.select,0,this.player.select_card.id_in_deck);
		hand.length -= this.player.draw_indexes.length;

		const updates = [];
		this.deck_list.forEach((v)=>{
			if (v.affected.updated)
			{
				updates.push(`[${v.id_in_deck},${v.data.id},${v.affected.power},${v.affected.hit},${v.affected.block}]`);
			}
		});

		return `{"h":[${hand.join(",")}],` +
			`"s":${this.select},` +
			`"u":[${updates.join(",")}],` +
			`"n":[${this.next_effect.power},${this.next_effect.hit},${this.next_effect.block}],` +
			`"dc":[${this.draw_indexes.join(",")}],` +
			`"d":${this.damage},` +
			`"l":${this.life}}`;
	}
}

module.exports = Player;
