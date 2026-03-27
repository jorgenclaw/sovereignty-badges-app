import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignerProvider } from './context/SignerContext';
import Nav from './components/Nav';
import HomePage from './pages/HomePage';
import ShelfPage from './pages/ShelfPage';
import BadgesPage from './pages/BadgesPage';
import ClaimPage from './pages/ClaimPage';
import FeedPage from './pages/FeedPage';

export default function App() {
  return (
    <SignerProvider>
      <BrowserRouter basename="/app">
        <Nav />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/p/:id" element={<ShelfPage />} />
          <Route path="/badges" element={<BadgesPage />} />
          <Route path="/claim" element={<ClaimPage />} />
          <Route path="/feed" element={<FeedPage />} />
        </Routes>
      </BrowserRouter>
    </SignerProvider>
  );
}
