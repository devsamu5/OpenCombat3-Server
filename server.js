'use strict';

const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port:PORT });


const GameProcessor = require("./game/processor");




class ClientData
{
    constructor(ws,data)
    {
        this.ws = ws;
        this.name = data.name;
        this.deck = data.deck
        this.regulation = data.regulation
    }
}

class GameRoom
{
    constructor(cd1,cd2)
    {
        this.game = new GameProcessor(cd1.deck,cd2.deck,cd1.regulation);
        this.client1 = cd1;
        this.client2 = cd2;

        this.select1 = -1;
        this.select2 = -1;

        this.client1.ws.send(JSON.stringify({
            type:"Primary",
            data:{
                name:cd1.name,
                rname:cd2.name,
                deck:cd1.deck,
                rdeck:cd2.deck,
                regulation:cd1.regulation
            }
        }));
        this.client2.ws.send(JSON.stringify({
            type:"Primary",
            data:{
                name:cd2.name,
                rname:cd1.name,
                deck:cd2.deck,
                rdeck:cd1.deck,
                regulation:cd1.regulation
            }
        }));
    }
    Ready(ws)
    {
        if (this.client1.ws == ws)
        {
            this.select1 = 1;
        }
        if (this.client2.ws == ws)
        {
            this.select2 = 1;
        }
        if (this.select1 > 0 && this.select2 > 0)
        {
            this.client1.ws.send({
                "type":"First",
                "data":{
                    "you":{
                        "hand":this.game.player1.hand,
                        "life":this.game.player1.life,
                    },
                    "rival":{
                        "hand":this.game.player2.hand,
                        "life":this.game.player2.life,
                    }
                }
            });
            this.client2.ws.send({
                "type":"First",
                "data":{
                    "you":{
                        "hand":this.game.player2.hand,
                        "life":this.game.player2.life,
                    },
                    "rival":{
                        "hand":this.game.player1.hand,
                        "life":this.game.player1.life,
                    }
                }
            });
            this.select1 = this.select2 = -1;
            console.log("GameStart:");
        }
    }
    Select(ws,data)
    {
        if (this.game.round < 0)
        {
            return;
        }

        if (ws === this.client1.ws)
        {
            this.select1 = data.i;
            this.game.reorder_hand1(data.h);
            console.log("Select P1:phase " + data.p + " index=" + data.i);
        }
        else if (ws === this.client2.ws)
        {
            this.select2 = data.i;
            this.game.reorder_hand2(data.h);
            console.log("Select P2:phase " + data.p + " index=" + data.i);
        }

        let acted = null;
        if (this.game.phase == 1)
        {
            if ((this.select1 >= 0 && this.select2 >= 0) ||
                (this.game.player1.is_recovery() && this.select2 >= 0) ||
                (this.game.player2.is_recovery() && this.select1 >= 0))
            {
                this.game.recover(this.select1,this.select2);
                acted = "Recovery";
            }
        }
        else
        {
            if (this.select1 >= 0 && this.select2 >= 0)
            {
                this.game.combat(this.select1,this.select2);
                acted = "Combat";
            }
        }
        if (acted)
        {
            const p1json = this.game.player1.output_json_string();
            const p2json = this.game.player2.output_json_string();

            const send1json = `{"type":"${acted}","data":{` +
                    `"r":${this.game.round},"n":${this.game.phase},"s":${this.game.situation},` +
                    `"y":${p1json},"r":${p2json}}}`;
            const send2json = `{"type":"${acted}","data":{` +
                    `"r":${this.game.round},"n":${this.game.phase},"s":${-this.game.situation},` +
                    `"y":${p2json},"r":${p1json}}}`;

            this.client1.ws.send(send1json);
            this.client2.ws.send(send2json);
        }
    }
    Surrender(ws)
    {
        if (ws == this.p1client.ws)
        {
            console.log("Surrender p1");
            this.p1client.ws.send(JSON.stringify({type:"End",data:{msg:"You lose"}}));
            this.p2client.ws.send(JSON.stringify({type:"End",data:{msg:"You win"}}));
        }
        else if (ws == this.p2client.ws)
        {
            console.log("Surrender p2");
            this.p1client.ws.send(JSON.stringify({type:"End",data:{msg:"You win"}}));
            this.p2client.ws.send(JSON.stringify({type:"End",data:{msg:"You lose"}}));
        }
    }
    Disconnect(ws)
    {
        if (this.timeout)
        {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        abort.a = "Disconnect";
        if (ws == this.p1client.ws)
        {
            if (this.p2client.ws.readyState == WebSocket.OPEN)
            {
                this.p2client.ws.send(JSON.stringify({type:"End",data:{msg:"rival disconnect"}}));
            }
        }
        else if (ws == this.p2client.ws)
        {
            if (this.p1client.ws.readyState == WebSocket.OPEN)
            {
                this.p1client.ws.send(JSON.stringify({type:"End",data:{msg:"rival disconnect"}}));
            }
        }
    }
    Terminalize()
    {
        this.p2client.ws.send(JSON.stringify({type:"End",data:{msg:"server error"}}));
        this.p1client.ws.send(JSON.stringify({type:"End",data:{msg:"server error"}}));
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
            {
                const room = Rooms.get(ws);
                room?.Select(ws,msg.data);
            }
            break;
        case "Ready":
            {
                const room = Rooms.get(ws);
                room?.Ready(ws);
            }
            break;
        case "Match":
            if (msg.version != GameMaster.CardCatalog.version)
            {
                ws.send(JSON.stringify({type:"End",data:{msg:"Version mismatch"}}));
                break;
            }
            const wait_ws = WaitRegulation.get(msg.data.regulation);
            if (wait_ws && wait_ws.readyState == WebSocket.OPEN)
            {
                console.log("Match:Matching");
                const wait_client = WaitRooms.get(wait_ws)
                if (wait_client)
                {
                    let room = new GameRoom(wait_client,new ClientData(ws,msg.data));
                    Rooms.set(ws,room);
                    Rooms.set(wait,room);
                    WaitRooms.delete(wait_ws)
                    WaitRegulation.delete(msg.data.regulation)
                }
            }
            else
            {
                WaitRooms.set(ws,new ClientData(ws,msg.data))
                WaitRegulation.set(msg.data.regulation,ws)
                console.log("Match:Wait");
            }
            break;
        case "End":
            {
                if (Rooms.has(ws))
                {
                    const room = Rooms.has(ws);
                    Rooms.delete(room.client1.ws);
                    Rooms.delete(room.client2.ws);
                    room.Surrender(ws);
                }
                if (WaitRooms.has(ws))
                {
                    const wait_room = WaitRooms.get(ws)
                    WaitRegulation.delete(wait_room.regulation)
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
            const room = Rooms.has(ws);
            Rooms.delete(room.client1.ws);
            Rooms.delete(room.client2.ws);
            room.Disconnect(ws);
        }
        if (WaitRooms.has(ws))
        {
            const wait_room = WaitRooms.get(ws)
            WaitRegulation.delete(wait_room.regulation)
            WaitRooms.delete(ws)
        }
    });
});
