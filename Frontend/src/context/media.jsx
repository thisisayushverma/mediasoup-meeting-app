import { useContext, useState } from "react";
import { createContext } from "react";

const MediaContext = createContext(null);
export const useMedia = () => useContext(MediaContext)

const MediaProvide = (props) => {
    const [producers, setProducers] = useState(new Map());
    const [consumers, setConsumers] = useState(new Map());
    const [biggerStream, setBiggerStream] = useState(null);

    const handleSetBiggerScreen = (videoTrack, audioTrack) => {
        console.log("comming to update");
        const tempStream = new MediaStream();
        if (videoTrack !== null && videoTrack !== undefined) {
            console.log("videoTrack");
            tempStream.addTrack(videoTrack);
        }
        if (audioTrack !== null && audioTrack !== undefined) {
            console.log("audioTrack");
            tempStream.addTrack(audioTrack);
        }

        setBiggerStream(tempStream)

    }
    return (
        <MediaContext.Provider
            value={{
                producers,
                setProducers, 
                consumers, 
                setConsumers, 
                biggerStream, 
                setBiggerStream,
                handleSetBiggerScreen
            }}>
            {props.children}
        </MediaContext.Provider>
    )
}

export {
    MediaProvide
}