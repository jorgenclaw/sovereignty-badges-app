import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { SignerProvider } from './context/SignerContext';
import Nav from './components/Nav';
import ConnectionModal from './components/ConnectionModal';
import HomePage from './pages/HomePage';
import ShelfPage from './pages/ShelfPage';
import BadgesPage from './pages/BadgesPage';
import ClaimPage from './pages/ClaimPage';
import FeedPage from './pages/FeedPage';
import ManageBadgesPage from './pages/ManageBadgesPage';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SignerProvider>
        <BrowserRouter basename="/app">
          <Nav />
          <ConnectionModal />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/p/:id" element={<ShelfPage />} />
            <Route path="/badges" element={<BadgesPage />} />
            <Route path="/claim" element={<ClaimPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/manage-badges" element={<ManageBadgesPage />} />
          </Routes>
        </BrowserRouter>
      </SignerProvider>
    </QueryClientProvider>
  );
}
