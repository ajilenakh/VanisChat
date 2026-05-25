import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ChatPage } from './components/Chat/ChatPage';
import { LobbyPage } from './components/Lobby/LobbyPage';
import { RoomProvider } from './context/RoomContext';

function App() {
  return (
    <BrowserRouter>
      <RoomProvider>
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route path="/room/:id" element={<ChatPage />} />
        </Routes>
      </RoomProvider>
    </BrowserRouter>
  );
}

export default App;
