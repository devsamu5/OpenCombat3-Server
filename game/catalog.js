
'use strict';
const fs = require("fs");


const Effect = require("./effect");
const Skill = require("./skill");
const Card = require("./card");


class Catalog
{
    constructor()
    {
        this.card_catalog = new Map();
        this.skill_catalog = new Map();
        
        this.effect_catalog = [];

        this.version  = "";

        this._load_effect_data()
        this._load_skill_data()
        this._load_card_data()
    
    }

    get_effect_data(id){return this.effect_catalog[id];}

    get_skill_param(param_type,param)
    {

        if (param_type == Skill.ParamType.INTEGER)
        {
            return Number(param);
        }
        if (param_type == Skill.ParamType.EFFECTS)
        {
            return param.split(" ").map((v) => {
                return Effect.Effect.create(v,this.effect_catalog);
            });
        }
        if (param_type == Skill.ParamType.VOID)
            return null
        return null
    }


    get_skill_data(id){return this.skill_catalog.get(id);}

    get_card_data(id){return this.card_catalog.get(id);}



    _load_effect_data()
    {
        const catalog = fs.readFileSync("./catalog/skill_effect_catalog.txt", "utf8");
        const effects = catalog.split("\n");
        this.effect_catalog = effects.map((v)=>{
            const tsv = v.split("\t");
            const id = Number(tsv[0])
            return new Effect.EffectData(id,tsv[1],tsv[2],tsv[3],tsv[4]);
        });
    }

    _load_skill_data()
    {
        const catalog =  fs.readFileSync("./catalog/named_skill_catalog.txt", "utf8");
        const skills = catalog.split("\n")
        skills.forEach((v)=>{
            const tsv = v.split("\t");
            const id = Number(tsv[0])
            this.skill_catalog.set(id,new Skill.SkillData(id,tsv[1],tsv[2],tsv[3],tsv[4],tsv[5]))
        })
    }

    _load_card_data()
    {
        const catalog =  fs.readFileSync("./catalog/card_data_catalog.txt", "utf8");
        const cards = catalog.split("\n");
        cards.forEach((v)=>{
            const tsv = v.split("\t");
            const id = Number(tsv[0]);

            const skills = [];
            const skill_texts = tsv[8].split(";");
            if (skill_texts.length == 1 && skill_texts[0] == "")
                skill_texts.length = 0;
            skill_texts.forEach((v)=>{
                const line = v.split(":");
                const condition = Number(line[0]);
                const data = this.get_skill_data(Number(line[1]));
                const param = this.get_skill_param(data.param_type,line[2]);
                skills.push(new Skill.Skill(data,condition,param));
            })
            this.card_catalog.set(id,new Card.CardData(id,tsv[1],tsv[2],
                    Number(tsv[3]),Number(tsv[4]),Number(tsv[5]),Number(tsv[6]),Number(tsv[7]),
                    skills,tsv[9],tsv[10]));
        })
        this.version = this.card_catalog.get(0).name
    }
}

module.exports = new Catalog();
