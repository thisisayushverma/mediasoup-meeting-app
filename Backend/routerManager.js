import mediasoup from "mediasoup";

const createRouter = async (worker)=>{
    const router = await worker.createRouter({
        mediaCodecs:[
            {
                kind:"audio",
                mimeType:"audio/opus",
                clockRate:48000
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


    return router;

}


export {
    createRouter
}