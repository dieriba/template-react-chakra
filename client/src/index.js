import { ColorModeScript } from '@chakra-ui/react';
import * as ReactDOM from 'react-dom/client';
import { disableReactDevTools } from '@fvilers/disable-react-devtools';
import App from './App';

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);

disableReactDevTools();

root.render(
  <ColorModeScript>
    <App />
  </ColorModeScript>
);
