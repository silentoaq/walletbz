import { usePhantomWallet } from '@/hooks/usePhantomWallet';
import { QRScanner } from '@/components/QRScanner';

export const ScanPage = () => {
  const { wallet } = usePhantomWallet();
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">掃描憑證領取碼</h1>
      <QRScanner did={wallet.did} />
    </div>
  );
};