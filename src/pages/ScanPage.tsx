import { usePhantomWallet } from '@/hooks/usePhantomWallet';
import { QRScanner } from '@/components/QRScanner';

export const ScanPage = () => {
  const { wallet } = usePhantomWallet();
  
  return (
    <div>
      <QRScanner did={wallet.did} />
    </div>
  );
};