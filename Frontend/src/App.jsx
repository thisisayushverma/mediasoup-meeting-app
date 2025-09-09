import { useState } from 'react'
import './App.css'
import { useNavigate } from 'react-router-dom'
import config from './config'

function App() {
  const [joiningRoomId, setJoiningRoomId] = useState('')
  const [streamingRoomId, setStreamingRoomId] = useState('')
  const navigate = useNavigate()

  const handleCreateRoom = async () => {
    navigate('/meeting')
  }

  const handleJoinRoom = async (e) => {
    // check room exist or not
    e.preventDefault();
    try {
      const response = await fetch(`${config.backendUrl}/check-room`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId: joiningRoomId
        })
      })

      if (response.status !== 200) {
        throw new Error("something went wrong")
      }

      const data = await response.json();
      console.log("data", data);

      navigate(`/meeting/${joiningRoomId}`)
    } catch (error) {
      console.log("error while entering room", error);
      alert("room is not exist, Create new room...")
    }
  }

  const handleStartStream = async (e) => {
    // check room exist or not
    e.preventDefault();
    if (streamingRoomId !== '') {
      try {
        const response = await fetch(`${config.backendUrl}/check-islive`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomId: streamingRoomId
          })
        })

        if (response.status !== 200) {
          throw new Error("something went wrong")
        }

        const data = await response.json();
        console.log("data", data);
        if(data.isLive){
          navigate(`/live/${streamingRoomId}`)
        }
        else{
          alert("room is not live")
        }

      } catch (error) {
        alert("room is not able to found")
      }
    }
    else {
      alert("Enter room id first")
    }
  }


  return (
    <>
      <div className='text-white w-full h-screen flex gap-2 items-center justify-center'>
        <div className='flex gap-5 w-[90%] items-center justify-between flex-col'>
          <div className='w-[45%] p-2 flex flex-col gap-3 py-5  rounded-md'>
            <h1 className='text-2xl font-semibold text-center'>Meeting</h1>
            <form onSubmit={(e) => handleJoinRoom(e)} className='flex flex-col gap-3'>
              <input
                type='text'
                className=' w-full bg-[#323131] rounded-md text-xl p-2'
                placeholder='Enter Room ID and press enter..'
                value={joiningRoomId}
                onChange={(e) => setJoiningRoomId(e.target.value)}
              />
              <button type='submit' className='text-center bg-[#323131] font-semibold text-xl p-2 rounded-md cursor-pointer'>
                Join Room
              </button>
            </form>
            <p className='text-center text-xl font-bold'>or</p>
            <div className='text-center bg-[#323131] font-semibold text-xl p-2 rounded-md cursor-pointer' onClick={handleCreateRoom}>
              Create Room
            </div>
          </div>
          <div className='h-[1px] w-[40%] bg-[#5d5c5c]' ></div>
          <div className='w-[45%] flex flex-col gap-3 p-2 py-5 rounded-md items-center '>
            <h1 className='text-2xl font-semibold text-center'>Live Stream</h1>
            <form className='w-full flex flex-col gap-3 ' onSubmit={(e) => handleStartStream(e)}>
              <input
                type='text'
                className=' w-full bg-[#323131] rounded-md text-xl p-2'
                placeholder='Enter Room ID'
                value={streamingRoomId}
                onChange={(e) => setStreamingRoomId(e.target.value)}
              />
              <button className='text-center bg-[#323131] font-semibold text-xl p-2 rounded-md cursor-pointer'>Join</button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

export default App
