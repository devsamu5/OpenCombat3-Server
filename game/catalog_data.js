
const NOCOLOR = 0;
const RED = 1;
const GREEN = 2;
const BLUE = 3;

class Stats
{
    constructor(p,h,b){
        this.power = p;
        this.hit = h;
        this.block = b;
    }
	duplicate()
    {
		return new Stats(this.power,this.hit,this.block);
    }

	add(other)
    {
		this.power += other.power
		this.hit += other.hit
		this.block += other.block
    }
	set_stats(p,h,b)
    {
		this.power = p
		this.hit = h
		this.block = b
    }

	to_array()
    {
		return [this.power,this.hit,this.block]
    }
}

class CardData
{
    constructor(i,c,l,p,h,b,s)
    {
	    this.id = i;
        this.color = c;
        this.level = l;
        this.power = p;
        this.hit = h;
        this.block = b;
	
        this.skills = s;
    }
}


const ColorCondition = Object.freeze({
    NOCONDITION:0,
    COLOR_BITS:3,
    VS_FLAG:4,
    VS_RED:5,
    VS_GREEN:6,
    VS_BLUE:7,
    LINK_FLAG:8,
    LINK_RED:9,
    LINK_GREEN:10,
    LINK_BLUE:11,
});

const ParamType = Object.freeze({
    VOID:0,
    INTEGER:1,
    ATTRIBUTES:2,
    COLOR:3,
});

class SkillData
{
    constructor(i,pt)
    {
		this.id = i;
        this.param_type = pt.split(",");
		if (this.param_type.length == 1 && this.param_type[0] == ParamType.VOID)
        {
            this.param_type = [];
        }
    }
}

class Skill
{
	constructor(sd,c,p)
    {
		this.data = sd;
		this.condition = c
		this.parameter = p;
    }

	test_condition(rival_color,link_color)
    {
		if (this.condition & ColorCondition.VS_FLAG)
			return (this.condition & ColorCondition.COLOR_BITS) == rival_color
		if (this.condition & ColorCondition.LINK_FLAG)
			return (this.condition & ColorCondition.COLOR_BITS) == link_color
		if (this.condition == ColorCondition.NOCONDITION)
			return true
		return false
    }
}

module.exports = {
    Stats:Stats,
    CardData:CardData,
    SkillData:SkillData,
    Skill:Skill,
    ColorCondition:ColorCondition,
    ParamType:ParamType,
}

