
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
});

class SkillData
{
    constructor(i,n,sn,pt,p,t)
    {
		this.id = i;
		this.name = n;
		this.short_name = sn;
        this.param_type = pt;
        this.parameter = p;
		this.text = t;
    }
}

class Skill
{
	constructor(sd,c,p)
    {
		this.data = sd;
		this.condition = c
		this.parameter = p;
        this.text = "";

        if (this.data.param_type == ParamType.INTEGER)
        {
			const param_string = "{" + this.data.parameter + "}"
			this.text = this.data.text.replace(param_string,"{" + this.parameter + "}")
        }
        else if (this.data.param_type == ParamType.EFFECTS)
        {
			const param_string = "{" + this.data.parameter + "}"
			const replace_string = this.parameter.map((v) => {
				return v.data.short_name + (v.parameter>0?"+":"") + v.parameter;
            });
    		this.text = this.data.text.replace(param_string,"{" + replace_string.join(" ") + "}")
        }
        else
        {
			this.text = this.data.text
        }
    }

	test_condition(rival_color,link_color)
    {
		if (this.condition & ColorCondition.VS_FLAG)
			return (condition & ColorCondition.COLOR_BITS) == rival_color
		if (this.condition & ColorCondition.LINK_FLAG)
			return (condition & ColorCondition.COLOR_BITS) == link_color
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

