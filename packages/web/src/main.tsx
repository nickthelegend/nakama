import React from 'react';
import { createRoot } from 'react-dom/client';
import { createDAppKit, DAppKitProvider } from '@mysten/dapp-kit-react';
import { SuiJsonRpcClient, JsonRpcHTTPTransport } from '@mysten/sui/jsonRpc';
import { App } from './App';
import './style.css';

const dAppKit = createDAppKit({
  networks: ['mainnet'],
  createClient: () => new SuiJsonRpcClient({ network: 'mainnet', transport: new JsonRpcHTTPTransport({ url: '/api/rpc' }) }),
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DAppKitProvider dAppKit={dAppKit}>
      <App />
    </DAppKitProvider>
  </React.StrictMode>,
);
