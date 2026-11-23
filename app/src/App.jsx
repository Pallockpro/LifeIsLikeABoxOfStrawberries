import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Collection from './pages/Collection';
import Search from './pages/Search';
import Game from './pages/Game';
import Library from './pages/Library';
import Settings from './pages/Settings';
import Videos from './pages/Videos';
import NotFound from './pages/NotFound';
import ToSModal from './components/ToSModal';
import { useStored } from './lib/storage';

function ToSGate({ children }) {
  const [accepted, setAccepted] = useStored('sb:tos-accepted', false);
  return (
    <>
      {!accepted && <ToSModal onAccept={() => setAccepted(true)} />}
      {accepted ? children : null}
    </>
  );
}

export default function App() {
  return (
    <ToSGate>
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="explore" element={<Explore />} />
        <Route path="explore/:key" element={<Collection />} />
        <Route path="search" element={<Search />} />
        <Route path="game/:id" element={<Game />} />
        <Route path="library" element={<Library />} />
        <Route path="videos" element={<Videos />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </ToSGate>
  );
}
