import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import fs from "fs";

const ffmpegProcesses = new Map();

const startFFmpeg = (roomId, sdpText) => {
    const sdpFile = `input_${roomId}.sdp`;
    const outputDir = `./public/live/${roomId}`;

    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(`${outputDir}/${sdpFile}`, sdpText);

    

    const ffmpegArg = [
        '-protocol_whitelist', 'file,udp,rtp',
        '-i', `${outputDir}/${sdpFile}`,
        '-c:v', 'libx264',
        '-preset', 'veryfast', '-tune', 'zerolatency',
        '-c:a', 'aac',
        '-r', '30',
        '-vsync', '1', 
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '5',
        '-hls_flags', 'delete_segments',
        `${outputDir}/index.m3u8`
    ];


    const ffmpeg = spawn(ffmpegPath, ffmpegArg);

    ffmpegProcesses.set(roomId, ffmpeg);

    ffmpeg.stderr.on('data', (data) => console.log("ffmpeg working", data.toString()));
    ffmpeg.on('close', (code) => {
        console.log(`FFmpeg for ${roomId} exited with code ${code}`);
        ffmpegProcesses.delete(roomId);
     });
}


const stopffmpeg = (roomId) => {
    try {
        ffmpegProcesses.get(roomId).kill('SIGKILL');
        // delete ffmpeg store file
        fs.rmSync(`./public/live/${roomId}`, { recursive: true });
        console.log("ffmpeg stopped and file deleted");
    } catch (error) {
        throw error
    }

}


export {
    startFFmpeg,
    stopffmpeg
}