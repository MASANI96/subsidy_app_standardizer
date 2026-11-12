import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ShareView } from './components/gantt/ShareView';
import { readSharePayload } from './utils/share';
import './index.css';

const sharePayload = readSharePayload();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {sharePayload ? <ShareView payload={sharePayload} /> : <App />}
  </StrictMode>
);
