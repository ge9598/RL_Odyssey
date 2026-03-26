import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TopBar } from '@/components/ui/TopBar';
import { HomePage } from '@/pages/HomePage';
import { TutorialPage } from '@/pages/TutorialPage';
import { MapPage } from '@/pages/MapPage';
import { IslandPage } from '@/pages/IslandPage';
import { PortPage } from '@/pages/PortPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home — no top bar */}
        <Route path="/" element={<HomePage />} />

        {/* All other pages with top bar */}
        <Route
          path="*"
          element={
            <div className="min-h-screen flex flex-col">
              <TopBar />
              <main className="flex-1">
                <Routes>
                  <Route path="/tutorial" element={<TutorialPage />} />
                  <Route path="/map" element={<MapPage />} />
                  <Route path="/island/:islandId" element={<IslandPage />} />
                  <Route path="/port/:portId" element={<PortPage />} />
                </Routes>
              </main>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
