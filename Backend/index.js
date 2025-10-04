import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { nanoid } from "nanoid";
import cors from "cors"
import MediaSoupManager from "./mediasoup.js"
import Rooms from "./room.js";
import { createRouter } from "./routerManager.js";
import Peer from "./peer.js";
import { startFFmpeg, stopffmpeg } from "./ffmpegWorker.js";
import path from "path";
import fs from "fs";


const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true
}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/live',express.static(path.join(process.cwd(),'public/live')));

const worker = new MediaSoupManager();
const rooms = new Rooms();

(async () => {
    await worker.initWorker();
})();

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});




io.on("connection", (socket) => {
    console.log("user connected", socket.id);

    socket.on('create-room', async () => {
        const roomId = nanoid(8);
        console.log("room created", roomId);
        socket.join(roomId);

        // creating router for each room
        const router = await worker.createRouter(roomId);
        console.log("routeer", router.id);
        const peer = new Peer(socket.id, socket);
        // console.log("peer",peer);
        rooms.addPeer(router.id, peer);
        const sendTransportParams = await worker.createTransport(roomId, peer, true);

        const recvTransportParams = await worker.createTransport(roomId, peer, false);


        // console.log(peer.getTransport(transportParams.id));
        console.log("all thing done");
        socket.emit("join-room-response", {
            roomId,
            exists: true,
            creator: true,
            sendTransportParams,
            recvTransportParams,
            codecsDetails: router.rtpCapabilities
        });



    })

    socket.on('send-transport-connect', (data, callback) => {
        console.log("transport connection called", socket.id);
        const { roomId, dtlsParameters, transportId } = data;
        const router = worker.getRouter(roomId)

        // get all peer in that routertrans
        const allPeers = rooms.getAllPeers(router.id);
        try {
            // find specific peer and send dtlsParameters
            const peer = allPeers.find((p) => p.peerId === socket.id);
            peer.getTransport(transportId).connect({ dtlsParameters });
            callback({ connected: true });
        } catch (error) {
            console.log(error);
            callback({
                connected: false,
                error: error.message
            });
        }
    })

    socket.on("send-transport-produce", async (data, callback) => {
        console.log("transport produce called", socket.id);
        const { roomId, kind, rtpParameters, appData, transportId } = data;

        console.log(appData);
        if (appData.mediaTag === "live") {
            // now send screen share video and other audio to different section
            
            return;
        }
        const router = worker.getRouter(roomId)

        // get all peer in that router
        const allPeers = rooms.getAllPeers(router.id);

        try {
            // find specific peer and send dtlsParameters
            const peer = allPeers.find((p) => p.peerId === socket.id);
            const producer = await peer.getTransport(transportId).produce({ kind, rtpParameters, appData: appData });
            // console.log(producer);
            // peer.addProducer(producer);
            rooms.addProducer(router.id, {producer,appData});

            socket.to(roomId).emit("peer-produced", {
                producerId: producer.id,
                kind: producer.kind,
                appData: producer.appData,
                peerId: socket.id
            });
            callback({ producerId: producer.id });
        } catch (error) {
            console.log(error);
            callback({
                connected: false,
                error: error.message
            });
        }
    })

    socket.on("recv-transport-connect", async (data, callback) => {
        console.log("recv-transport-connect", socket.id);
        const { roomId, dtlsParameters, transportId } = data;
        console.log("recv-transport-producer", roomId, transportId);
        const router = worker.getRouter(roomId)

        // get all peer in that router
        const allPeers = rooms.getAllPeers(router.id);
        try {
            // find specific peer and send dtlsParameters
            const peer = allPeers.find((p) => p.peerId === socket.id);
            peer.recvTransport.connect({ dtlsParameters });
            callback({ connected: true });
        } catch (error) {
            console.log(error);
            callback({
                connected: false,
                error: error.message
            });
        }
    })

    socket.on("consume", async (data, callback) => {
        const { roomId, producerId, rtpCapabilities, appData, peerId } = data;
        console.log("consume calls", socket.id);
        console.log("consume calls", roomId, producerId);
        const router = worker.getRouter(roomId)
        // console.log("router",router,worker);
        // console.log(router.canConsume({
        //     producerId,
        //     rtpCapabilities
        // }));
        try {
            if (!router.canConsume({
                producerId,
                rtpCapabilities
            })) {
                return callback({ error: "can not consume" });
            }

            console.log("checker for able to consume");
            // get all peer in that router
            const allPeers = rooms.getAllPeers(router.id);
            const peer = allPeers.find((p) => p.peerId === socket.id);

            const recvTransport = peer.recvTransport;

            const consumer = await recvTransport.consume({
                producerId,
                rtpCapabilities,
                paused: true,
                appData
            });
            peer.addConsumer(consumer);
            // console.log("peer all consumer",peer.consumers);
            callback({
                id: consumer.id,
                producerId,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
                type: consumer.type,
                producerPaused: consumer.producerPaused,
                peerId
            });

            consumer.on("transportclose", () => {
                consumer.close();
                peer[socket.id].consumers.delete(consumer.id);
            });
        } catch (error) {
            console.log("error consuming", error);
        }

    })

    socket.on("consumer-resume", async (data) => {
        console.log("comming for resume consumer");
        const { consumerId, roomId } = data;
        const router = worker.getRouter(roomId);
        const allPeers = rooms.getAllPeers(router.id);
        const peer = allPeers.find((p) => p.peerId === socket.id);
        const consumer = peer.consumers.get(consumerId);
        await consumer.resume();
    })

    socket.on('join-room', async (data) => {
        const { roomId } = data;
        console.log("join room call", roomId);
        if (roomId === undefined) {
            socket.emit("join-room-status", { roomId, exists: false, message: "Room does not exist" });
            return;
        }
        socket.join(roomId);
        console.log(io.sockets.adapter.rooms.get(roomId));

        const router = worker.getRouter(roomId);
        console.log("routeer", router.id);
        const peer = new Peer(socket.id, socket);
        // console.log("peer",peer);
        rooms.addPeer(router.id, peer);
        const sendTransportParams = await worker.createTransport(roomId, peer, true);

        const recvTransportParams = await worker.createTransport(roomId, peer, false);

        // check producer is already present or not

        const isProducerExists = rooms.getProducers(router.id);
        


        // console.log(peer.getTransport(transportParams.id));
        console.log("all thing done");
        socket.emit("join-room-response", {
            roomId,
            exists: true,
            creator: true,
            sendTransportParams,
            recvTransportParams,
            codecsDetails: router.rtpCapabilities,
            isProducerExists:isProducerExists.length>0?true:false
        });
        socket.to(roomId).emit("user-joined", { socketId: socket.id });
        // socket.emit("join-status", { roomId, exists: true, creator: false });
    })
    

    socket.on('take-all-producer',(data)=>{
        console.log("take all producer");
        const {roomId} = data;
        try {
            const router = worker.getRouter(roomId);
            const allProducer = rooms.getProducers(router.id);

            allProducer.map((producer)=>{
                socket.emit("peer-produced", {
                    producerId: producer.producer.id,
                    kind: producer.producer.kind,
                    appData: producer.producer.appData,
                    peerId: producer.appData.peerId
                });
            })

        } catch (error) {
            console.log("error",error);
        }
    })

    socket.on('leave-room', (data) => {
        const { roomId } = data;
        socket.leave(roomId);
        console.log("leave room");
        const router = worker.getRouter(roomId);
        socket.to(roomId).emit("user-left", { socketId: socket.id });
        rooms.removeProducer(router,)
    })

    socket.on('disconnect', () => {
        console.log(socket.rooms);
        console.log("user disconnected", socket.id);

    })


    // socket.on('start-live-stream', async (data) => {
    //     try {
    //         console.log("start live stream");
    //         const { roomId, producerId,appData } = data;
    //         const router = worker.getRouter(roomId);
    //         const plainTransport = await rooms.createPlainTransport(roomId, worker);

    //         await plainTransport.connect({
    //             ip: "127.0.0.1",
    //             port: 5004,
    //             rtcpPort: 5005
    //         });

    //         let sdpFFmpeg = `v=0\no=- 0 0 IN IP4 127.0.0.1\ns=Mediasoup RTP Stream\nc=IN IP4 127.0.0.1\nt=0 0\n`

    //         const liveScreenConsumer = await plainTransport.consume({
    //             producerId: producerId,
    //             rtpCapabilities: router.rtpCapabilities
    //         });

    //         const vParams = liveScreenConsumer.rtpParameters;
    //         const vCodec = vParams.codecs[0];


    //         sdpFFmpeg += `m=video 5004 RTP/AVP ${vCodec.payloadType}\na=rtpmap:${vCodec.payloadType} ${vCodec.mimeType.split('/')[1]}/${vCodec.clockRate}\na=ssrc:${vParams.encodings[0].ssrc} cname:video\n`;


    //         rooms.getProducers(router.id).map(async (producer) => {
    //             console.log("i come",producer.appData);
    //             if (producer.appData.mediaTag === "mic") {
    //                 console.log("i come for mic");
    //                 const audioConsumer = await plainTransport.consume({
    //                     producerId: producer.id,
    //                     rtpCapabilities: router.rtpCapabilities
    //                 });

    //                 const aParams = audioConsumer.rtpParameters;
    //                 const aCodec = aParams.codecs[0]; 
    //                 sdpFFmpeg += `m=audio 5004 RTP/AVP ${aCodec.payloadType}\na=rtpmap:${aCodec.payloadType} ${aCodec.mimeType.split('/')[1]}/${aCodec.clockRate}/2\na=ssrc:${aParams.encodings[0].ssrc} cname:audio-${producer.id}\n`;   
    //             }
    //         })

    //         startFFmpeg(roomId,sdpFFmpeg);

    //     } catch (error) {
    //         console.log("error", error);
    //     }
    // })

    // socket.on('end-live-stream', (data) => {
    //     console.log("end live stream");
    //     try {
    //         const { roomId } = data;
    //         stopffmpeg(roomId);
    //     } catch (error) {
    //         console.log("error while deleting stored file", error);
    //     }
    // })
})




app.get("/", (req, res) => {
    res.send("hello world");
})

app.post('/check-room', (req, res) => {
    try {
        const { roomId } = req.body;
        console.log("roomId", roomId);
        const checkRoomExists = io.sockets.adapter.rooms.has(roomId);

        if (!checkRoomExists) {
            console.log("room does not exist");
            socket.emit("join-status", { roomId, exists: true });
            return res.status(200).json({ exists: false, message: "Room does not exist" });
        }
        console.log("room exists");
        return res.status(200).json({ exists: true, message: "Room exists" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
})

app.post('/check-islive',(req,res)=>{
    try {
        const { roomId } = req.body;
        const outputDir = path.join(process.cwd(),`./public/live/${roomId}`);
        if(fs.existsSync(outputDir)){
            return res.status(200).json({isLive:true});
        }else{
            return res.status(200).json({isLive:false});
        }
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
})



server.listen(3000, () => {
    console.log("server is running on port 3000");
})