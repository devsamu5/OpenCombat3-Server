
const MechanicsData = require("./mechanics_data");

const SkillProcessor = require("./skill_processor");

const skills = [
	null,
	SkillProcessor.Reinforce,
	SkillProcessor.Pierce,
	SkillProcessor.Charge,
	SkillProcessor.Isolate,
	SkillProcessor.Absorb,
]

class SkillFactory extends MechanicsData.ISkillFactory
{
    _create(skill) {
    	return new skills[skill.data.id](skill);
    }
}

module.exports = SkillFactory;
