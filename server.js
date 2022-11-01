'use strict';

const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port:PORT });


//const GameMaster = require("./");




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
        this.game = new GameMaster(cd1.deck,cd2.deck,cd1.regulation);
        this.client1 = cd1;
        this.client2 = cd2;

        this.ready1 = false;
        this.ready2 = false;

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
            this.ready1 = true;
        }
        if (this.client2.ws == ws)
        {
            this.ready2 = true;
        }
        if (this.ready1 && this.ready2)
        {
            this.client1.ws.send({
                "type":"First",
                "data":{
                    "you":{
                    "hand":[],
                    "life":int,
                    },
                    "rival":{
                    "hand":[],
                    "life":int,
                    }
                }
            });
            this.client2.ws.send({
                "type":"First",
                "data":{
                    "you":{
                    "hand":[],
                    "life":int,
                    },
                    "rival":{
                    "hand":[],
                    "life":int,
                    }
                }
            });
            console.log("GameStart:");
        }
    }
    Select(ws,data)
    {
        if (ws === this.client1.ws)
        {
            this.game.SetP1Select(data.phase,data.index);
            console.log("Select P1:phase " + data.phase + " index=" + data.index);
        }
        else if (ws === this.client2.ws)
        {
             this.game.SetP2Select(data.phase,data.index);
             console.log("Select P2:phase " + data.phase + " index=" + data.index);
        }
        if (this.game.Selected())
        {
            this.Decide();
        }
    }
    Decide()
    {
        console.log("Decide:");
        const [p1,p2] = this.game.Decide();
        this.p1client.ws.send(p1);
        this.p2client.ws.send(p2);
        console.log(p1);
        if (this.game.phase < 0)
        {
            console.log("Game End");
            return;
        }
    }
    Surrender(ws)
    {
        if (ws == this.p1client.ws)
        {
            console.log("Surrender p1");
            abort.d = 1;
            this.p1client.ws.send(JSON.stringify(abort));
            abort.d = -1;
            this.p2client.ws.send(JSON.stringify(abort));
        }
        else if (ws == this.p2client.ws)
        {
            console.log("Surrender p2");
            abort.d = 1;
            this.p2client.ws.send(JSON.stringify(abort));
            abort.d = -1;
            this.p1client.ws.send(JSON.stringify(abort));
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
                abort.d = -1;
                this.p2client.ws.send(JSON.stringify(abort));
            }
//            setTimeout(()=>this.p2client.ws.close(1000),1000);
        }
        else if (ws == this.p2client.ws)
        {
            if (this.p1client.ws.readyState == WebSocket.OPEN)
            {
                abort.d = -1;
                this.p1client.ws.send(JSON.stringify(abort));
            }
//            setTimeout(()=>this.p1client.ws.close(1000),1000);
        }
    }
    Terminalize()
    {
        if (this.timeout)
            clearTimeout(this.timeout);

        abort.d = 0;
        abort.a = "Term";

        this.p1client.ws.send(JSON.stringify(abort));
        this.p2client.ws.send(JSON.stringify(abort));
//        setTimeout(()=>this.p1client.ws.close(1000),1000);
//        setTimeout(()=>this.p2client.ws.close(1000),1000);
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
