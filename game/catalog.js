
'use strict';
const fs = require("fs");

const CatalogData = require("./catalog_data");

const SkillParamType = CatalogData.ParamType;


class Catalog
{
    constructor()
    {
        this.card_catalog = new Map();
        this.skill_catalog = new Map();
        
        this.version  = "";

        this._load_skill_data()
        this._load_card_data()
    }

    get_skill_param(param_type,param)
    {
        if (param_type == SkillParamType.INTEGER)
        {
            return Number(param);
        }
        if (param_type == SkillParamType.ATTRIBUTES)
        {
            const r = new CatalogData.Stats(0,0,0);
            param.split(" ").forEach((v) => {
                if (v.startsWith("P"))
                    r.power = Number(v.substring(1));
                else if (v.startsWith("H"))
                    r.hit = Number(v.substring(1));
                else if (v.startsWith("B"))
                    r.block = Number(v.substring(1));
            });
            return r;
        }
        if (param_type == SkillParamType.COLOR)
        {
            return Number(param);
        }
        return null
    }

    get_skill_data(id){return this.skill_catalog.get(id);}

    get_card_data(id){return this.card_catalog.get(id);}


    _load_skill_data()
    {
        const catalog =  fs.readFileSync("./catalog/named_skill_catalog.txt", "utf8");
        const skills = catalog.split("\n")
        skills.forEach((v)=>{
            const tsv = v.split("\t");
            const id = Number(tsv[0])
            this.skill_catalog.set(id,new CatalogData.SkillData(id,tsv[3]))
        })
    }

    _load_card_data()
    {
        const catalog =  fs.readFileSync("./catalog/card_data_catalog.txt", "utf8");
        const cards = catalog.split("\n");
        cards.forEach((v)=>{
            const tsv = v.split("\t");
            const id = Number(tsv[0]);

            const skill_texts = tsv[8].split(";");
            if (skill_texts.length == 1 && skill_texts[0] == "")
                skill_texts.length = 0;

            const skills = skill_texts.map((v)=>{
                const line = v.split(":");
                const condition = Number(line[0]);
                const data = this.get_skill_data(Number(line[1]));
                const param = line[2].split(",").map((v,i)=>{
                    return this.get_skill_param(data.param_type[i],v);
                });
                return new CatalogData.Skill(data,condition,param);
            })
            this.card_catalog.set(id,new CatalogData.CardData(id,
                    Number(tsv[3]),Number(tsv[4]),
                    Number(tsv[5]),Number(tsv[6]),Number(tsv[7]),
                    skills));
        })
        const version = cards[0].split("\t")[1];
        this.version = version;
    }
}

module.exports = new Catalog();
