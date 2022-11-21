
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
    EFFECTS:2,
    COLOR:3,
});

class SkillData
{
    constructor(i,n,pt,p)
    {
		this.id = i;
		this.name = n;
        this.param_type = pt.split(",");
		if (this.param_type.length == 1 && this.param_type[0] == ParamType.VOID)
        {
            this.param_type = [];
            this.parameter = [];
        }
        else
        {
            this.parameter = p.split(",");
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
    SkillData:SkillData,
    Skill:Skill,
    ColorCondition:ColorCondition,
    ParamType:ParamType,
}

