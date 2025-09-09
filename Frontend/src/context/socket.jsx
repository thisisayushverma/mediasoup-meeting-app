import { createContext, useContext, useRef } from "react"
import { io } from "socket.io-client"
import config from "../config"


const SocketContext = createContext(null);
const useSocket = () => useContext(SocketContext);

export default useSocket


const SocketProvider = (props)=>{

    const socketRef = useRef(io(config.backendUrl))
    console.log("in socket");
    

    return (
        <SocketContext.Provider value={{socketRef}}>
            {props.children}
        </SocketContext.Provider>
    )
}


export {
    SocketProvider
}