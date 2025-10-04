import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Card from '../components/Card'
import useSocket from '../context/socket.jsx'
import * as mediasoupClient from "mediasoup-client"
import { getDisplayMedia, openMediaDevices } from '../services/webrtc.js'
import { useMedia } from '../context/media.jsx'

function Meeting() {
    const roomID = useRef(useParams().roomId)
    const [roomValue, setRoomValue] = useState(roomID.current)
    const [mic, setMic] = useState(false)
    const [cam, setCam] = useState(false)
    const [screen, setScreen] = useState(false)
    const [localCamStream, setLocalCamStream] = useState(new MediaStream())
    const [localScreenStream, setLocalScreenStream] = useState(new MediaStream())
    const { socketRef } = useSocket()
    const device = new mediasoupClient.Device();
    const sendTransport = useRef(null);
    const receiveTransport = useRef(null);
    const camRef = useRef(null);
    const { consumers, producers, setConsumers, setProducers, biggerStream, setBiggerStream } = useMedia();
    const [liveStream, setLiveStream] = useState(false);
    const [liveUpStream, setLiveUpStream] = useState(new MediaStream());
    const navigate = useNavigate();




    console.log("consumers", consumers);

    useEffect(() => {
        console.log("update steam");
        camRef.current.srcObject = biggerStream
    }, [biggerStream])

    useEffect(() => {

        socketRef.current.on("connect", () => {
            console.log("user connected to BE");
        })

        if (roomID.current === undefined) {
            // create room
            console.log("this call");
            socketRef.current.emit("create-room");
        }
        else {
            // join room
            console.log("this not call");
            socketRef.current.emit("join-room", ({ roomId: roomID.current }));
        }


        socketRef.current.on("user-left", (data) => {
            const {socketId} = data
            console.log("user leave",data);
            console.log(consumers);

            setConsumers(prev => {
                console.log(prev);
                const newMap = new Map(prev);
                newMap.delete(socketId);
                return newMap
            })

        })


        socketRef.current.on("join-room-response", async (data) => {
            console.log(data);
            // taking createTransport credential from BE and setting transport way
            const { codecsDetails, sendTransportParams, recvTransportParams, exists, roomId, isProducerExists } = data
            if (exists === false) {
                alert("room is not exist, Create new room / Try again later")
                return;
            }
            if (roomID.current === undefined) {
                console.log("roomId is undefined", roomId);
                roomID.current = roomId
                setRoomValue(roomId)
            }
            await device.load({ routerRtpCapabilities: codecsDetails })
                .then(() => {
                    // sendTransport
                    const sentTransport = device.createSendTransport({
                        id: sendTransportParams.id,
                        iceParameters: sendTransportParams.iceParameters,
                        iceCandidates: sendTransportParams.iceCandidates,
                        dtlsParameters: sendTransportParams.dtlsParameters
                    })
                    sendTransport.current = sentTransport

                    // receiveTransport

                    const recvTransport = device.createRecvTransport({
                        id: recvTransportParams.id,
                        iceParameters: recvTransportParams.iceParameters,
                        iceCandidates: recvTransportParams.iceCandidates,
                        dtlsParameters: recvTransportParams.dtlsParameters
                    })
                    receiveTransport.current = recvTransport

                    // add event listener for user to send data 

                    sendTransport.current.on("connect", ({ dtlsParameters }, callback, errback) => {
                        console.log("transport connection called");
                        socketRef.current.emit("send-transport-connect",
                            { roomId, dtlsParameters, transportId: sendTransport.current.id },
                            (response) => {
                                console.log("comming back from BE after calling connect for produce");
                                if (response.error) {
                                    errback(response.error)
                                } else {
                                    callback()
                                }
                            })
                    })

                    sendTransport.current.on("produce", async ({ kind, rtpParameters, appData }, callback, errback) => {
                        console.log("transport produce called");
                        socketRef.current.emit("send-transport-produce",
                            { transportId: sendTransport.current.id, roomId, kind, rtpParameters, appData, peerId: socketRef.current.id }, (resolve) => {
                                if (resolve.error) {
                                    errback(resolve.error)
                                }
                                else {
                                    callback({ id: resolve.producerId })
                                }
                            })
                    })

                    sendTransport.current.on("close", () => {
                        console.log("transport closed");
                    })

                    // add listener for user to consume data
                    receiveTransport.current.on("connect", ({ dtlsParameters }, callback, errback) => {
                        socketRef.current.emit("recv-transport-connect", { transportId: receiveTransport.current.id, dtlsParameters, roomId }, (response) => {
                            if (response.error) {
                                errback(response.error)
                            } else {
                                callback()
                            }
                        });
                    });

                    if (isProducerExists) {
                        socketRef.current.emit("take-all-producer", { roomId });
                    }

                })
                .catch(err => console.log(err))
        })


        socketRef.current.on("peer-produced", async (data) => {
            const { producerId, kind, peerId, appData } = data;
            console.log("peer-producces calls", producerId, kind, peerId, appData, roomID.current);
            // const consumer = await receiveTransport.current.consume({
            //     producerId,

            // })

            // if (peerId === socketRef.current.id) {
            //     console.log("you are calling yourself");
            //     return;
            // }

            // 2) Make sure recvTransport exists
            if (!receiveTransport.current) {
                console.error("No recvTransport yet, cannot consume.");
                return;
            }

            socketRef.current.emit("consume", {
                roomId: roomID.current,
                producerId,
                rtpCapabilities: device.rtpCapabilities,
                appData,
                peerId
            }, async (data) => {
                const { id, kind, rtpParameters, producerId, type, producerPaused, peerId } = data;
                console.log("back from consume backend", receiveTransport.current);

                try {
                    const consumer = await receiveTransport.current.consume({
                        id,
                        producerId,
                        kind,
                        rtpParameters,
                        appData
                    });

                    console.log(consumer.appData);
                    consumer.on("transportclose", () => {
                        console.log("consumer transport closed");
                    })

                    consumer.on("trackended", () => {
                        console.log("consumer track ended");
                    })

                    consumer.on("producerclose", () => {
                        console.log("Producer was closed by remote user");
                        consumer.close(); // always clean up here
                    });

                    console.log(consumers);

                    setConsumers(prev => {
                        console.log(prev);
                        const newMap = new Map(prev);
                        const prevObject = newMap.get(peerId) || {};
                        const updatedObject = { ...prevObject, [consumer.appData.mediaTag]: consumer };
                        newMap.set(peerId, updatedObject);
                        return newMap
                    })

                    // const stream = new MediaStream();
                    // stream.addTrack(consumer.track);
                    // camRef.current.srcObject = stream;

                    socketRef.current.emit("consumer-resume", { consumerId: consumer.id, roomId: roomID.current });
                } catch (error) {
                    console.log("error", error);
                }
            });
        })

        socketRef.current.on("user-joined", (socketId) => {
            console.log("user joined", socketId);
        })

        return () => {
            socketRef.current.emit("end-live-stream", {
                roomId: roomID.current
            })
            socketRef.current.disconnect((roomID.current));
            sendTransport.current?.close();
            receiveTransport.current?.close();
            // all media track should remove
        }
    }, [])


    useEffect(() => {
        const handleLiveStream = async () => {
            if (liveStream) {
                console.log("i come for live stream");
                // send req to backend to start live stream
                const liveStream = await getDisplayMedia({
                    video: {
                        cursor: "always"
                    }
                })

                setLiveUpStream(prev => {
                    const tempStream = new MediaStream(prev ? prev.getTracks() : []);
                    tempStream?.addTrack(liveStream.getVideoTracks()[0]);
                    console.log("temp stream live on", tempStream.getTracks());
                    return tempStream
                })

                const producer = await sendTransport.current?.produce({
                    track: liveStream.getVideoTracks()[0],
                    kind: "video",
                    appData: {
                        peerId: socketRef.current.id,
                        mediaTag: "live"
                    }
                })

                producer.on("transportclose", () => console.log("Producer transport closed"));
                producer.on("trackended", () => console.log("Track ended"));
                console.log("Producer created with id:", producer.id);

                socketRef.current.emit("start-live-stream", {
                    roomId: roomID.current,
                    producerId: producer.id,
                    // rtpCapabilities: device.rtpCapabilities,
                    appData: producer.appData
                })
            }
            else {
                // send req to backend to stop live stream
                console.log("i come for end live stream");
                setLiveUpStream(prev => {
                    const tempStream = new MediaStream(prev ? prev.getTracks() : []);
                    tempStream?.getTracks().forEach((track) => {
                        if (track.kind === "video") {
                            track.stop();
                            prev.removeTrack(track);
                        }
                    })
                    return tempStream
                })

                socketRef.current.emit("end-live-stream", {
                    roomId: roomID.current
                })

            }
        }

        handleLiveStream();
    }, [liveStream])


    useEffect(() => {
        const handleToggleCam = async () => {
            if (cam) {
                const camStream = await openMediaDevices({ video: true });
                setLocalCamStream(prev => {
                    const tempStream = new MediaStream(prev ? prev.getTracks() : []);
                    tempStream?.addTrack(camStream.getVideoTracks()[0]);
                    console.log("temp stream cam on", tempStream.getTracks());
                    return tempStream
                })

                const producer = await sendTransport.current?.produce({
                    track: camStream.getVideoTracks()[0],
                    kind: "video",
                    appData: {
                        peerId: socketRef.current.id,
                        mediaTag: "cam"
                    }
                })

                producer.on("transportclose", () => console.log("Producer transport closed"));
                producer.on("trackended", () => console.log("Track ended"));
                console.log("Producer created with id:", producer.id);

            }
            else {
                setLocalCamStream(prev => {
                    const tempStream = new MediaStream(prev ? prev.getTracks() : []);
                    tempStream?.getTracks().forEach((track) => {
                        if (track.kind === "video") {
                            track.stop();
                            tempStream.removeTrack(track);
                        }
                    })
                    console.log("tempStream cam off", tempStream?.getTracks());
                    return tempStream;
                })
            }
        }

        handleToggleCam()
    }, [cam])

    useEffect(() => {
        const handleMicToggle = async () => {
            if (mic) {
                const micStream = await openMediaDevices({ audio: true });
                setLocalCamStream(prev => {
                    const tempStream = new MediaStream(prev ? prev.getTracks() : []);
                    tempStream?.addTrack(micStream.getAudioTracks()[0]);
                    console.log("temp stream mic on", tempStream.getTracks());
                    return tempStream;
                })

                const producer = await sendTransport.current?.produce({
                    track: micStream.getAudioTracks()[0],
                    kind: "audio",
                    appData: {
                        peerId: socketRef.current.id,
                        mediaTag: "mic"
                    }
                })

                producer.on("transportclose", () => console.log("Producer transport closed"));
                producer.on("trackended", () => console.log("Track ended"));
                console.log("Producer created with id:", producer.id);
            }
            else {
                setLocalCamStream(prev => {
                    const tempStream = new MediaStream(prev ? prev.getTracks() : []);
                    tempStream?.getTracks().forEach((track) => {
                        if (track.kind === "audio") {
                            track.stop();
                            prev.removeTrack(track);
                        }
                    })
                    console.log("tempStream mic off", tempStream?.getTracks());
                    return tempStream;
                })
            }
        }
        handleMicToggle();

    }, [mic])


    useEffect(() => {
        const handleScreenShare = async () => {
            if (screen) {
                const screenStream = await getDisplayMedia({ video: true });
                setLocalScreenStream(prev => {
                    const tempScreenStream = new MediaStream(prev ? prev.getTracks() : []);
                    tempScreenStream?.addTrack(screenStream.getVideoTracks()[0]);
                    return tempScreenStream
                })

                const producer = await sendTransport.current?.produce({
                    track: screenStream.getVideoTracks()[0],
                    kind: "video",
                    appData: {
                        peerId: socketRef.current.id,
                        mediaTag: "screen"
                    }
                })

                producer.on("transportclose", () => console.log("Producer transport closed"));
                producer.on("trackended", () => console.log("Track ended"));
                console.log("Producer created with id:", producer.id);
            }
            else {
                setLocalScreenStream(prev => {
                    const tempStream = new MediaStream(prev ? prev.getTracks() : []);
                    tempStream?.getTracks().forEach((track) => {
                        if (track.kind === "video") {
                            track.stop();
                            prev.removeTrack(track);
                        }
                    })
                    return tempStream;
                })
            }
        }
        handleScreenShare();
    }, [screen])


    const handleClose = () => {
        socketRef.current.emit("leave-room", {
            roomId: roomID.current
        })
        socketRef.current.disconnect();
        navigate("/");
    }



    return (
        <div className='text-white h-screen w-full border flex gap-2 relative'>
            <div className='w-[80%] border'>
                <h1 className='absolute bottom-5 left-10 rounded-md  text-lg p-2 bg-[#363030]'>{roomValue}</h1>
                <div className='w-full h-[90%] border'>
                    <video ref={camRef} className='border-2 h-full w-full' autoPlay></video>
                </div>
                <div className='w-full h-[10%] border flex gap-2 justify-center items-center p-2'>

                    <button
                        className={`px-3 rounded-md font-semibold text-2xl cursor-pointer ${liveStream ? 'bg-green-900' : 'bg-red-900'}`}
                        onClick={() => setLiveStream(prev => !prev)}
                    >
                        LiveStream
                    </button>

                    <button
                        className={`px-3 rounded-md font-semibold text-2xl cursor-pointer ${mic ? 'bg-green-900' : 'bg-red-900'}`}
                        onClick={() => setMic(prev => !prev)}
                    >
                        Mic
                    </button>
                    <button className={`px-3 rounded-md font-semibold text-2xl cursor-pointer ${cam ? 'bg-green-900' : 'bg-red-900'}`} onClick={() => setCam(prev => !prev)}>
                        Camera
                    </button>
                    <button className={`px-3 rounded-md font-semibold text-2xl cursor-pointer ${screen ? 'bg-green-900' : 'bg-red-900'}`} onClick={() => setScreen(prev => !prev)}>
                        Screen Share
                    </button>
                    <button className='px-3 rounded-md font-semibold text-2xl cursor-pointer bg-red-900' onClick={handleClose}>
                        Close
                    </button>
                </div>
            </div>
            <div className='w-[20%] m-2 p-2  flex flex-col gap-2 overflow-auto'>
                {
                    Array.from(consumers.entries()).map(([peerId, tracks]) => {
                        return (
                            <Card name={peerId} key={peerId} vidTrack={tracks.cam?.track} audTrack={tracks.mic?.track} onClick={() => { handleSetBiggerScreen(tracks.cam?.track, tracks.mic?.track) }} />
                        )
                    })
                }
                {
                    Array.from(consumers.entries()).map(([peerId, tracks]) => {
                        return (
                            <Card name={peerId} key={`${peerId}-screen`} vidTrack={tracks.screen?.track} />
                        )
                    })
                }
                {
                    localCamStream?.getTracks().length > 0 && (
                        <Card name={socketRef.current.id} key={socketRef.current.id} vidTrack={localCamStream?.getVideoTracks()[0]} audTrack={localCamStream?.getAudioTracks()[0]} isMuted={true} />
                    )
                }
                {
                    localScreenStream?.getTracks().length > 0 && (
                        <Card name={socketRef.current.id} key={`${socketRef.current.id}-screen`} vidTrack={localScreenStream?.getVideoTracks()[0]} isMuted={true} />
                    )
                }
            </div>
        </div>
    )
}

export default Meeting
