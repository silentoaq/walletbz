import { useState } from 'react';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanBarcode, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { QRScanner } from '@/components/QRScanner';

type ScanMode = 'receive' | 'present';

export const ScanPage = () => {
  const { wallet } = usePhantomWallet();
  const [mode, setMode] = useState<ScanMode>('receive');
  const navigate = useNavigate();
  const [credentials] = useLocalStorage<string[]>('walletCredentials', []);
  
  const handlePresentUri = (uri: string) => {
    navigate(`/present?request_uri=${encodeURIComponent(uri)}`);
  };
  
  const hasCredentials = credentials.length > 0;
  
  const titleText = mode === 'receive' ? '掃描憑證領取碼' : '掃描憑證出示碼';
  
  return (
    <div>
      <div className="flex mb-6 border rounded-lg overflow-hidden">
        <button
          className={`flex-1 py-3 text-center font-medium ${
            mode === 'receive' ? 'bg-blue-600 text-white' : 'bg-gray-100'
          }`}
          onClick={() => setMode('receive')}
        >
          <ScanBarcode className="h-5 w-5 inline-block mr-1" />
          領取憑證
        </button>
        <button
          className={`flex-1 py-3 text-center font-medium ${
            mode === 'present' ? 'bg-blue-600 text-white' : 'bg-gray-100'
          }`}
          onClick={() => setMode('present')}
        >
          <Send className="h-5 w-5 inline-block mr-1" />
          出示憑證
        </button>
      </div>
      
      {/* 出示模式但沒有憑證的處理 */}
      {mode === 'present' && !hasCredentials ? (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-gray-500 mb-3">您目前沒有可出示的憑證</p>
            <Button variant="outline" onClick={() => setMode('receive')}>
              前往領取憑證
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{titleText}</CardTitle>
          </CardHeader>
          <CardContent>
            <QRScanner 
              did={wallet.did} 
              mode={mode} 
              onSubmit={mode === 'present' ? handlePresentUri : undefined}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};