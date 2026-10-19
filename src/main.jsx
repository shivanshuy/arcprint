import { createRoot } from 'react-dom/client';
import '@fontsource/barlow-condensed/400.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/architects-daughter/400.css';
import '@fontsource/caveat/400.css';
import './styles.css';
import Editor from './Editor.jsx';

createRoot(document.getElementById('root')).render(<Editor />);
