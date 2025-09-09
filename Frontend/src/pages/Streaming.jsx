import React, { useEffect,useRef } from 'react'
import { useParams } from 'react-router-dom';
import Hls from "hls.js"; 
import config from '../config.js';

function Streaming() {
  const videoRef = useRef(null)
  const roomId = useParams().roomId
  console.log("rromId",roomId);

  useEffect(() => {
    if (!roomId) return;

    const video = videoRef.current;
    const streamUrl = `${config.backendUrl}/live/${roomId}/index.m3u8`;
    console.log(streamUrl);

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => console.error("Autoplay blocked:", err));
      });

      return () => hls.destroy();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch((err) => console.error("Autoplay blocked:", err));
      });
    }
  }, [roomId]);

  return (
    <div className="flex justify-center items-center min-h-screen text-white ">
      <div className="w-full max-w-4xl">
        <video
          ref={videoRef}
          controls
          autoPlay
          muted
          playsInline
          className="w-full rounded-2xl shadow-lg border border-gray-700"
        />
        <p className="text-center text-gray-400 mt-2">
          Live Stream for Room <span className="font-semibold text-white">{roomId}</span>
        </p>
      </div>
    </div>
  )
}

export default Streaming
