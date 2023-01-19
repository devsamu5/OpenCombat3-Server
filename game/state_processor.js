
//const CatalogData = require("./catalog_data");
const MechanicsData = require("./mechanics_data");
//const Player = require("./player");


const Timing = MechanicsData.EffectTiming;


class NextPlus extends MechanicsData.BasicState
{
    static get STATE_ID() {return 1;}
    static get PRIORITY() {return 1;}
    constructor(stats,container)
    {
        super(container);
        this.stats = stats;
    }

	_before_priority() {return [NextPlus.PRIORITY];}

	_process_before(index,_priority,myself,_rival)
    {
        const affected = myself.get_playing_card().affected;
		affected.add(this.stats)
		myself.append_effect_log(index,Timing.BEFORE,NextPlus.PRIORITY,true)
		this.remove_self()
    }

	_serialize()
    {
		return [NextPlus.STATE_ID,this.stats.to_array()]
    }
}

module.exports.NextPlus = NextPlus;
