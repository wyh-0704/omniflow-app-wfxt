import { HashRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import Personalization from './pages/Personalization';
import NotFound from './pages/NotFound';

const App = () => (
  <HashRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/1091fa4a-ed53-4503-b0e7-2e9078e58a83" element={<Index />} />
      <Route path="/personalization" element={<Personalization />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </HashRouter>
);

export default App;
