import { useState } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera } from "lucide-react";
import { useCredentialReceiver } from '@/hooks/useCredentialReceiver';

interface QRScannerProps {
  did: string | null;
  mode: 'receive' | 'present';
  onSubmit?: (value: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ 
  did, 
  mode = 'receive',
  onSubmit 
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const { state, processCredentialOffer } = useCredentialReceiver(did);
  
  // 開始掃描 QR 碼
  const startScanning = () => {
    setScanning(true);
    // 在實際實現中，這裡應該啟動相機並處理QR碼掃描
    // 暫時用alert模擬
    alert(`開始掃描${mode === 'receive' ? '憑證領取碼' : '驗證方要求'}，此功能即將完善...`);
    setTimeout(() => setScanning(false), 1000);
  };
  
  // 處理手動輸入
  const handleManualInput = () => {
    if (!inputValue) return;
    
    if (mode === 'receive') {
      processCredentialOffer(inputValue);
    } else if (onSubmit) {
      onSubmit(inputValue);
    }
  };

  // 掃描區塊的標籤文本
  const scanText = mode === 'receive' 
    ? '掃描憑證領取碼' 
    : '掃描憑證出示碼';
  
  // 輸入框的佔位符文本
  const placeholder = mode === 'receive' 
    ? '貼上憑證領取連結' 
    : '貼上驗證請求連結';
  
  // 按鈕文本
  const buttonText = mode === 'receive' ? '領取' : '提交';
  
  return (
    <div className="space-y-4">
      {/* 錯誤和成功訊息 - 僅在領取模式顯示 */}
      {mode === 'receive' && state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      
      {mode === 'receive' && state.success && (
        <Alert className="bg-green-50 border-green-300 text-green-800">
          <AlertDescription>憑證已成功領取並儲存！</AlertDescription>
        </Alert>
      )}
      
      {/* 掃描區域 */}
      {scanning ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center">
          <div className="bg-gray-200 w-full h-64 flex items-center justify-center">
            <p className="text-gray-500">掃描 QR 碼中...</p>
          </div>
          <Button onClick={() => setScanning(false)} className="mt-4">取消掃描</Button>
        </div>
      ) : (
        <Button 
          onClick={startScanning} 
          className="w-full py-6"
          variant="outline"
          size="lg"
        >
          <Camera className="h-5 w-5 mr-2" />
          <span>{scanText}</span>
        </Button>
      )}
      
      {/* 分隔線 */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">或者</span>
        </div>
      </div>
      
      {/* 手動輸入 */}
      <div className="flex space-x-2">
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1"
        />
        <Button 
          onClick={handleManualInput} 
          disabled={!inputValue || (mode === 'receive' && state.isLoading)}
          type="button"
        >
          {state.isLoading ? '處理中...' : buttonText}
        </Button>
      </div>
    </div>
  );
};

export default QRScanner;