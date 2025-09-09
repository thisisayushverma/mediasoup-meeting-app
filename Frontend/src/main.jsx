import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom'
import Meeting from './pages/Meeting.jsx'
import Streaming from './pages/Streaming.jsx'
import { SocketProvider } from './context/socket.jsx'
import { MediaProvide } from './context/media.jsx'

const router = createBrowserRouter(
  createRoutesFromElements(
    [
      <Route path='' element={<App />} />,
      <Route path='/meeting' element={
        <SocketProvider>
          <MediaProvide>
            <Meeting />
          </MediaProvide>
        </SocketProvider>
      } />,
      <Route path='/meeting/:roomId' element={
        <SocketProvider>
          <MediaProvide>
            <Meeting />
          </MediaProvide>
        </SocketProvider>
      } />,
      <Route path='/live/:roomId' element={<Streaming />} />,
    ]
  )
)

createRoot(document.getElementById('root')).render(
  // <StrictMode>
  <RouterProvider router={router} />
  // </StrictMode>,
)
