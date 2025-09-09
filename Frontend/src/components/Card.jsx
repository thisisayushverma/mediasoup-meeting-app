import React, { useEffect, useRef } from 'react'
import { useMedia } from '../context/media.jsx';

function Card({ name = "Anonymous", vidTrack = null, audTrack = null, isMuted = false }) {

  const { 
    setBiggerStream,
    handleSetBiggerScreen } = useMedia();

  const stream = new MediaStream()
  if (vidTrack !== null && vidTrack !== undefined) {
    console.log("vidTrack", vidTrack);
    stream.addTrack(vidTrack)
  }
  if (audTrack !== null && audTrack !== undefined) {
    console.log("audTrack", audTrack);
    stream.addTrack(audTrack)
  }
  const videoRef = useRef(null)
  useEffect(() => {
    if (stream !== null) {
      console.log("stream", stream.getTracks());
      videoRef.current.srcObject = stream
    }
  }, [vidTrack, audTrack])
  return (
    <div className='relative border-1 w-full aspect-video p-2 rounded-md' onClick={() => handleSetBiggerScreen(vidTrack, audTrack)}>
      <h1 className='absolute top-0 left-3 font-semibold '>Card {name}</h1>
      <video ref={videoRef} autoPlay className='w-full h-full border' muted={isMuted} />
    </div>
  )
}

export default Card
