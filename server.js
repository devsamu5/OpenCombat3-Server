'use strict';

const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port:PORT });


const catalog = require("./game/catalog")

const GameProcessor = require("./game/processor");

const Regulation = require("./game/regulation")

const COMBAT_RESULT_DELAY = 5000
const COMBAT_SKILL_DELAY = 1000
const RECOVERY_RESULT_DELAY = 1000

const GRACE_PERIOD = 5000


class ClientData
{
    constructor(ws,data)
    {
        this.ws = ws;
        this.name = data.name;
        this.deck = data.deck;
        this.deck_regulation = data.deck_regulation;
        this.match_regulation = data.match_regulation;

        this.select = -1;
        this.remain_time = 0;
    }
}

class GameRoom
{
    constructor(cd1,cd2,deck_regulation,match_regulation)
    {
        this.deck_regulation = deck_regulation;
        this.match_regulation = match_regulation;
        this.game = new GameProcessor(cd1.deck,cd2.deck,match_regulation.hand_count);
        this.client1 = cd1;
        this.client2 = cd2;
        this.starting_time = 0;

        this.client1.ws.send(JSON.stringify({
            type:"Primary",
            data:{
                name:cd1.name,
                rname:cd2.name,
                deck:cd1.deck,
                rdeck:cd2.deck,
                deck_regulation:cd1.deck_regulation,
                match_regulation:cd1.match_regulation
            }
        }));
        this.client2.ws.send(JSON.stringify({
            type:"Primary",
            data:{
                name:cd2.name,
                rname:cd1.name,
                deck:cd2.deck,
                rdeck:cd1.deck,
                deck_regulation:cd1.deck_regulation,
                match_regulation:cd1.match_regulation
            }
        }));
    }
    Ready(ws)
    {
        if (this.client1.ws == ws)
        {
            this.client1.select = 1;
        }
        if (this.client2.ws == ws)
        {
            this.client2.select = 1;
        }
        if (this.client1.select > 0 && this.client2.select > 0)
        {
            this.client1.ws.send(JSON.stringify({
                type:"First",
                data:{
                    you:{
                        hand:this.game.player1.hand,
                        life:this.game.player1.life,
                        time:this.match_regulation.thinking_time * 1000
                    },
                    rival:{
                        hand:this.game.player2.hand,
                        life:this.game.player2.life,
                        time:this.match_regulation.thinking_time * 1000
                    }
                }
            }));
            this.client2.ws.send(JSON.stringify({
                type:"First",
                data:{
                    you:{
                        hand:this.game.player2.hand,
                        life:this.game.player2.life,
                        time:this.match_regulation.thinking_time * 1000
                    },
                    rival:{
                        hand:this.game.player1.hand,
                        life:this.game.player1.life,
                        time:this.match_regulation.thinking_time * 1000
                    }
                }
            }));
            this.client1.select = this.client2.select = -1;
            this.client1.remain_time = this.client2.remain_time = this.match_regulation.thinking_time * 1000;
            const delay = this.match_regulation.combat_time * 1000 + 1000;
            this.starting_time = Date.now() + delay;
            console.log("GameStart:");
        }
    }
    Select(ws,data)
    {
        if (data.p == this.game.round * 2 + this.game.phase)
        {
            if (ws === this.client1.ws)
            {
                const elapse = Date.now() - this.starting_time;
                if (elapse >= 0)
                    this.client1.remain_time -= elapse;
                if (this.client1.remain_time + GRACE_PERIOD < 0)
                {
                    this.client1.select = 0;
                }
                else
                {
                    this.client1.select = data.i;
                    this.game.reorder_hand1(data.h);
                }
                this.client1.remain_time = Math.max(this.client1.remain_time,0)
                console.log("Select P1:phase " + data.p + " index=" + data.i);
            }
            else if (ws === this.client2.ws)
            {
                const elapse = Date.now() - this.starting_time;
                if (elapse >= 0)
                    this.client2.remain_time -= elapse;
                if (this.client2.remain_time + GRACE_PERIOD < 0)
                {
                    this.client2.select = 0;
                }
                else
                {
                    this.client2.select = data.i;
                    this.game.reorder_hand2(data.h);
                }
                this.client2.remain_time = Math.max(this.client2.remain_time,0)
                console.log("Select P2:phase " + data.p + " index=" + data.i);
            }
        }

        let acted = null;
        let delay = 0;
        if (this.game.phase == 1)
        {
            if ((this.client1.select >= 0 && this.client2.select >= 0) ||
                (this.game.player1.is_recovery() && this.client2.select >= 0) ||
                (this.game.player2.is_recovery() && this.client1.select >= 0))
            {
                this.game.recover(this.client1.select,this.client2.select);
                acted = "Recovery";
                delay = RECOVERY_RESULT_DELAY;
            }
        }
        else if (this.game.phase == 0)
        {
            if (this.client1.select >= 0 && this.client2.select >= 0)
            {
                this.game.combat(this.client1.select,this.client2.select);
                acted = "Combat";
                const skill_count = this.game.player1.skill_log.length + this.game.player2.skill_log.length;
                delay = skill_count * COMBAT_SKILL_DELAY + COMBAT_RESULT_DELAY;
            }
        }
        if (acted)
        {
            this.client1.select = this.client2.select = -1;
            const p1json = this.game.player1.output_json_string(this.client1.remain_time);
            const p2json = this.game.player2.output_json_string(this.client2.remain_time);

            const send1json = `{"type":"${acted}","data":{` +
                    `"rc":${this.game.round},"np":${this.game.phase},"ls":${this.game.situation},` +
                    `"y":${p1json},"r":${p2json}}}`;
            const send2json = `{"type":"${acted}","data":{` +
                    `"rc":${this.game.round},"np":${this.game.phase},"ls":${-this.game.situation},` +
                    `"y":${p2json},"r":${p1json}}}`;

            this.client1.ws.send(send1json);
            this.client2.ws.send(send2json);
            if (this.game.phase == 0)
                delay += this.match_regulation.combat_time * 1000;
            else if (this.game.phase == 1)
                delay += this.match_regulation.recovery_time * 1000;
            this.starting_time = Date.now() + delay;
        }
    }
    Surrender(ws)
    {
        if (ws == this.client1.ws)
        {
            console.log("Surrender p1");
            this.client1.ws.send(JSON.stringify({type:"End",data:{msg:"You lose"}}));
            this.client2.ws.send(JSON.stringify({type:"End",data:{msg:"You win"}}));
        }
        else if (ws == this.client2.ws)
        {
            console.log("Surrender p2");
            this.client1.ws.send(JSON.stringify({type:"End",data:{msg:"You win"}}));
            this.client2.ws.send(JSON.stringify({type:"End",data:{msg:"You lose"}}));
        }
    }
    Disconnect(ws)
    {
        if (ws == this.client1.ws)
        {
            if (this.client2.ws.readyState == WebSocket.OPEN)
            {
                this.client2.ws.send(JSON.stringify({type:"End",data:{msg:"rival disconnect"}}));
            }
        }
        else if (ws == this.client2.ws)
        {
            if (this.client1.ws.readyState == WebSocket.OPEN)
            {
                this.client1.ws.send(JSON.stringify({type:"End",data:{msg:"rival disconnect"}}));
            }
        }
    }
    Terminalize()
    {
        this.client2.ws.send(JSON.stringify({type:"End",data:{msg:"server error"}}));
        this.client1.ws.send(JSON.stringify({type:"End",data:{msg:"server error"}}));
    }
}

var Rooms = new Map();
var WaitRooms = new Map();
var WaitRegulation = new Map();


wss.on('connection', (ws,req) => {
//    req.url
    console.log("connect:");
    ws.on('message', (json) => {
        const msg = JSON.parse(json);
        switch (msg.type)
        {
        case "Select":
            if (Rooms.has(ws))
            {
                const room = Rooms.get(ws);
                room.Select(ws,msg.data);
                if (room.game.phase == -1)
                {
                    Rooms.delete(room.client1.ws);
                    Rooms.delete(room.client2.ws);
                }
            }
            break;
        case "Ready":
            if (Rooms.has(ws))
            {
                const room = Rooms.get(ws);
                room.Ready(ws);
            }
            break;
        case "Match":
            const wait_ws = WaitRegulation.get(msg.data.deck_regulation + msg.data.match_regulation);
            if (wait_ws && wait_ws.readyState == WebSocket.OPEN)
            {
                console.log("Match:Matching");
                const wait_client = WaitRooms.get(wait_ws)
                if (wait_client)
                {
                    const d_reg = Regulation.DeckRegulation.create(msg.data.deck_regulation);
                    const m_reg = Regulation.MatchRegulation.create(msg.data.match_regulation);
                    if (d_reg && m_reg)
                    {
                        let room = new GameRoom(wait_client,new ClientData(ws,msg.data),d_reg,m_reg);
                        Rooms.set(ws,room);
                        Rooms.set(wait_ws,room);
                        WaitRooms.delete(wait_ws)
                        WaitRegulation.delete(msg.data.deck_regulation + msg.data.match_regulation)
                    }
                    else
                    {
                        ws.send(JSON.stringify({type:"End",data:{msg:"wrong regulation"}}));
                        wait_ws.send(JSON.stringify({type:"End",data:{msg:"wrong regulation"}}));
                        WaitRooms.delete(wait_ws)
                        WaitRegulation.delete(msg.data.deck_regulation + msg.data.match_regulation)
                    }
                }
            }
            else
            {
                WaitRooms.set(ws,new ClientData(ws,msg.data))
                WaitRegulation.set(msg.data.deck_regulation + msg.data.match_regulation,ws)
                console.log("Match:Wait");
            }
            break;
        case "Version":
            ws.send(JSON.stringify({type:"Version",data:{result:(msg.data.version == catalog.version)}}));
            break;
        case "End":
            {
                if (Rooms.has(ws))
                {
                    const room = Rooms.get(ws);
                    Rooms.delete(room.client1.ws);
                    Rooms.delete(room.client2.ws);
                    room.Surrender(ws);
                }
                if (WaitRooms.has(ws))
                {
                    const wait_room = WaitRooms.get(ws)
                    WaitRegulation.delete(wait_room.deck_regulation + wait_room.match_regulation)
                    WaitRooms.delete(ws)
                }
            }
            break;
        }

    });

    ws.on('close', () => {
        console.log("connection:close");
        if (Rooms.has(ws))
        {
            const room = Rooms.get(ws);
            Rooms.delete(room.client1.ws);
            Rooms.delete(room.client2.ws);
            room.Disconnect(ws);
        }
        if (WaitRooms.has(ws))
        {
            const wait_room = WaitRooms.get(ws)
            WaitRegulation.delete(wait_room.deck_regulation + wait_room.match_regulation)
            WaitRooms.delete(ws)
        }
    });
});
