
const NOCOLOR = 0;
const REC = 1;
const GREEN = 2;
const BLUE = 3;

class CardData
{
    constructor(i,n,sn,c,l,p,h,b,s,t,im)
    {
	    this.id = i;
        this.name = n;
        this.short_name = sn;
        this.color = c;
        this.level = l;
        this.power = p;
        this.hit = h;
        this.block = b;
	
        this.skills = s;
        this.text = t;
        this.image = im;
    }
}

class Affected
{
    constructor(){
        this.updated = false;
        this.power = 0
        this.hit = 0
        this.block = 0
    }
	set_p(v) {this.power = v;this.updated = true;}
	set_h(v) {this.hit = v;this.updated = true;}
	set_b(v) {this.block = v;this.updated = true;}

	add(p,h,b){
		this.power += p;
		this.hit += h;
		this.block += b;
		this.updated = true;
    }
		
	reset_update(){this.updated = false;}
	reset(){
        this.power = 0;
        this.hit = 0;
        this.block = 0;
        this.updated = true;
    }
}

class Card{
	constructor(cd,iid){
		this.data = cd;
		this.id_in_deck = iid;
        this.affected = new Affected()
    }

	get_current_power(){return Math.max(this.data.power + this.affected.power,0);}
	get_current_hit(){return Math.max(this.data.hit + this.affected.hit,0);}
	get_current_block(){return Math.max(this.data.block + this.affected.block,0);}
}

module.exports = {
    CardData:CardData,
    Affected:Affected,
    Card:Card
}
