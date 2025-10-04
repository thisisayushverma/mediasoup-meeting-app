import mediasoup from "mediasoup";

class MediaSoupManager {

    constructor(){
        this.worker = null;
        this.routerMap = new Map();
    }

    async initWorker() {
        try {
            this.worker = await mediasoup.createWorker({
                rtcMinPort:30000,
                rtcMaxPort:40000,
                logLevel: "warn" | "error",
                logTags: ["info", "ice", "dtls", "rtp", "srtp", "rtcp"]
            });
    
            this.worker.on('listenererror', (err) => {
                console.log(err);
            });
            
            this.worker.on("died",()=>{
                console.log("mediasoup worker died");
            });
            
            console.log("worker created successfully");
        } catch (error) {
            console.log("error creating worker", error);
        }
    }

    createRouter = async (roomId)=>{
        const router = await this.worker.createRouter({
            mediaCodecs:[
                {
                    kind:"audio",
                    mimeType:"audio/opus",
                    clockRate:48000,
                    channels:2
                },
                {
                    kind:"video",
                    mimeType:"video/VP8",
                    clockRate:90000
                },
                {
                    kind:"video",
                    mimeType:"video/VP9",
                    clockRate:90000
                },
                {
                    kind:"video",
                    mimeType:"video/h264",
                    clockRate:90000,
                    parameters:{
                        "packetization-mode": 1,          // Required for Safari
                        "profile-level-id": "42e01f" 
                    }
                }
            ]
        })
        this.routerMap.set(roomId,router);
        return router;
    }

    getRouter = (roomId)=>{
        return this.routerMap.get(roomId);
    }

    deleteRouter = (roomId)=>{
        const router = this.getRouter(roomId);
        if(!router) return;
        router.router.close();
        this.routerMap.delete(roomId);
    }

    createTransport = async (roomId,peerObj,isProducer)=>{
        const router = this.getRouter(roomId);
        if(!router) return;

        const transport = await router.createWebRtcTransport({
            listenIps:[{ip: "0.0.0.0",announcedIp: "backend.onmeet.ayushverma.dev"}],
            enableUdp:true,
            enableTcp:true,
            preferUpd:true
        }) 

        peerObj.addTransport(transport);
        if(isProducer){
            peerObj.setSendTransport(transport);
        }else{
            peerObj.setRecvTransport(transport);
        }
        return {
            id:transport.id,
            iceParameters:transport.iceParameters,
            iceCandidates:transport.iceCandidates,
            dtlsParameters:transport.dtlsParameters
        }
    }
    

}


export default MediaSoupManager