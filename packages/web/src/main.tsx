import React from 'react';
import { createRoot } from 'react-dom/client';
import { createDAppKit, DAppKitProvider } from '@mysten/dapp-kit-react';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { App } from './App';
import { registerDemoWallet } from './demo-wallet';
import './style.css';

await registerDemoWallet();
const dAppKit = createDAppKit({
  networks: ['mainnet'],
  createClient: () => new SuiGrpcClient({ network: 'mainnet', baseUrl: 'https://fullnode.mainnet.sui.io:443' }),
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DAppKitProvider dAppKit={dAppKit}>
      <App />
    </DAppKitProvider>
  </React.StrictMode>,
);
