

const CatalogData = require("./catalog_data");


class Card{
	constructor(cd,iid,factory){
		this.data = cd;
		this.id_in_deck = iid;
        this.affected = new CatalogData.Stats(0,0,0);
        this.skills = [];
        this.skills.length = cd.skills.length
        for (let i = 0;i < cd.skills.length;i++)
        {
			this.skills[i] = factory._create(cd.skills[i]);
        }
    }

	get_current_power(){return Math.max(this.data.power + this.affected.power,0);}
	get_current_hit(){return Math.max(this.data.hit + this.affected.hit,0);}
	get_current_block(){return Math.max(this.data.block + this.affected.block,0);}
}

const EffectTiming = Object.freeze({
	BEFORE:0,
	ENGAGED:1,
	AFTER:2,
	END:3
});

class EffectLog
{
	constructor(i,t,p,d)
    {
        this.index = i;
        this.timing = t;
        this.priority = p;
        this.data = d;
    }
}

class IEffect
{
	_before_priority(){return [];}
	_process_before(_index,_priority,_myself,_rival){}
	_engaged_priority(){return [];}
	_process_engaged(_index,_priority,situation,_myself,_rival){return situation;}
	_after_priority(){return [];}
	_process_after(_index,_priority,_situation,_myself,_rival){}
	_end_priority(){return [];}
	_process_end(_index,_priority,_situation,_myself,_rival){}
}


class ISkill extends IEffect
{
	_get_skill(){return null;} // CatalogData.Skill
}

class BasicSkill extends ISkill
{
    constructor(skill)
    {
        super();
        this._skill = skill;
    }
	_get_skill()
    {
		return this._skill;
    }
}

class ISkillFactory
{
	_create(_skill) // in CatalogData.SkillData out ISkill
    {
        return null;
    }
}


class IState extends IEffect
{
	_serialize()//# [id,fit_data]
    {
        return [0,null];
    }
}
class BasicState extends IState
{
    constructor(container)
    {
        super();
        this._container = container;
        this._container.push(this);
    }
	remove_self()
    {
        const index = this._container.indexOf(this);
		this._container.splice(index,1);
    }
}

module.exports = {
    Card:Card,
    EffectTiming:EffectTiming,
    EffectLog:EffectLog,
    IEffect:IEffect,
    ISkill:ISkill,
    BasicSkill:BasicSkill,
    ISkillFactory:ISkillFactory,
    IState:IState,
    BasicState:BasicState,
}

