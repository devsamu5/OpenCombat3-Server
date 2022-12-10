
class DeckRegulation
{
    constructor(cc,tc,l2l,l3l,cp_string)
    {
        this.card_count = cc;
	    this.total_cost = tc;
        this.level2_limit = l2l;
        this.level3_limit = l3l;
        this.card_pool = [];
		const cp = cp_string.split(" ");
		for (let i = 0; i < cp.length; i++)
        {
            const r = cp[i].split("-");
			if (r.length == 1)
            {
                this.card_pool.push(Number(r[0]));
                this.card_pool.push(Number(r[0]));
            }
			else
            {
				this.card_pool.push(Number(r[0]));
				this.card_pool.push(Number(r[1]));
            }
        }
    }
    static create(regulation_string)
    {
		const p = regulation_string.split("/");
        if (p.length != 5)
            return null;
        return new DeckRegulation(Number(p[0]),Number(p[1]),Number(p[2]),Number(p[3]),p[4]);
    }

	check_regulation(deck,catalog)
    {
    	if (deck.length != this.card_count)
            return false;
		
		let cost = 0;
		let level2_count = 0;
		let level3_count = 0;
		let same_card_count = new Map();;
		for (let i = 0; i < deck.length;i++)
        {
            if (!this.check_card_pool(deck[i]))
                return false;
			const cd = catalog.get_card_data(id);
			cost += cd.level;
			level2_count += (cd.level == 2) ? 1 : 0;
			level3_count += (cd.level == 3) ? 1 : 0;
			if (!same_card_count.has(id))
				same_card_count.set(id,1);
			else
            {
				const same_count = same_card_count.get(id) + 1;
				same_card_count.set(id,same_count);
				if ((cd.level == 1 && same_count > 3) || (cd.level == 2 && same_count > 2) || cd.level == 3)
                    return false;
            }
        }
		if (cost > this.total_cost || level2_count > this.level2_limit || level3_count > this.level3_limit)
            return false;
		return true;
    }

    check_card_pool(id)
    {
        for (let i = 0; i < this.card_pool.length;i+=2)
        {
            if (this.card_pool[i] <= id && id <= this.card_pool[i+1])
                return true;
        }
        return false;
    }
}


class MatchRegulation
{
	constructor(hc,tt,cat,rat)
    {
		this.hand_count = hc;
		this.thinking_time = tt;
		this.combat_additional_time = cat;
		this.recovery_additional_time = rat;
    }
	static create(regulation_string)
    {
		const hand = regulation_string.split("/");
		if (hand.length != 2)
			return null;
		const time = hand[1].split("+");
		if (time.length != 3)
			return null;
		return new MatchRegulation(Number(hand[0]),Number(time[0]),Number(time[1]),Number(time[2]));
    }	
}

module.exports = {
    DeckRegulation:DeckRegulation,
    MatchRegulation:MatchRegulation
}
