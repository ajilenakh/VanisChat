import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ChatPage } from './components/Chat/ChatPage';
import { ErrorBoundary } from './components/Chat/ErrorBoundary';
import { LobbyPage } from './components/Lobby/LobbyPage';
import { RoomProvider } from './context/RoomContext';

function App() {
  return (
    <BrowserRouter>
      <RoomProvider>
        <Routes>
          <Route path="/" element={<LobbyPage />} />
          <Route
            path="/room/:id"
            element={
              <ErrorBoundary>
                <ChatPage />
              </ErrorBoundary>
            }
          />
        </Routes>
      </RoomProvider>
    </BrowserRouter>
  );
}

export default App;
