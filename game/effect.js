


const Attribute = Object.freeze({
	POWER:1,
	HIT:2,
	BLOCK:3,
});

class EffectData
{
	constructor(i,p,n)
    {
		this.id = i;
		this.pid = p;
		this.name = n;
    }
}

class Effect
{
	constructor(d,p)
    {
		this.data = d;
		this.parameter = p;
    }

    static create(text,catalog)
    {
        const f = catalog.find((v)=>{return text.startsWith(v.pid);});
        if (f)
            return new Effect(f,Number(text.substring(f.pid.length)))
    	return null
    }
}

module.exports = {
    EffectData:EffectData,
    Effect:Effect,
    Attribute:Attribute,
}