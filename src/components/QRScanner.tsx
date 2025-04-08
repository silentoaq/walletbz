import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCredentialReceiver } from '@/hooks/useCredentialReceiver';

export const QRScanner = ({ did }: { did: string | null }) => {
  const [qrValue, setQrValue] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const { state, processCredentialOffer } = useCredentialReceiver(did);
  
  // 手動輸入 URI
  const handleManualInput = () => {
    if (!qrValue) return;
    processCredentialOffer(qrValue);
  };
  
  // 開始掃描 QR 碼
  const startScanning = () => {
    setScanning(true);
    // 在實際實現中，初始化 QR 掃描器
    // 這裡僅作示範
  };
  
  const stopScanning = () => {
    setScanning(false);
  };
  
  // 模擬掃描結果處理函數 - 實際環境下應由掃描庫觸發
  //const handleScanResult = (result: string) => {
  //  if (result) {
  //    setQrValue(result);
  //    processCredentialOffer(result);
  //    stopScanning();
  //  }
  //};
  
  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">掃描憑證領取碼</h2>
      
      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      
      {state.success && (
        <Alert className="mb-4">
          <AlertDescription>憑證已成功領取並儲存！</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-4">
        {scanning ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center">
            <div className="bg-gray-200 w-full h-64 flex items-center justify-center">
              <p className="text-gray-500">掃描 QR 碼中...</p>
              {/* 實際專案中，這裡會放置 QR 掃描器的視圖元件 */}
            </div>
            <Button onClick={stopScanning} className="mt-4">取消掃描</Button>
          </div>
        ) : (
          <Button onClick={startScanning} className="w-full py-6">
            開始掃描 QR 碼
          </Button>
        )}
        
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">或者</span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Input
            placeholder="貼上憑證領取連結"
            value={qrValue}
            onChange={(e) => setQrValue(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={handleManualInput} 
            disabled={!qrValue || state.isLoading}
            type="button"
          >
            {state.isLoading ? '處理中...' : '領取'}
          </Button>
        </div>
      </div>
    </div>
  );
};