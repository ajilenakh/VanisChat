import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ChatPage } from './components/Chat/ChatPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ErrorFallback, RoomErrorFallback } from './components/ErrorFallback';
import { LobbyPage } from './components/Lobby/LobbyPage';
import { RoomProvider } from './context/RoomContext';

function App() {
  return (
    <BrowserRouter>
      <RoomProvider>
        <Routes>
          <Route
            path="/"
            element={
              <ErrorBoundary fallback={<ErrorFallback />}>
                <LobbyPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/room/:id"
            element={
              <ErrorBoundary fallback={<RoomErrorFallback />}>
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
