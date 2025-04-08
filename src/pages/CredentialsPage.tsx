import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CredentialViewer } from '@/components/CredentialViewer';
import { FilePlus2 } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export const CredentialsPage = () => {
  const [credentials] = useLocalStorage<string[]>('walletCredentials', []);
  const hasCredentials = credentials.length > 0;
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">我的憑證</h1>
      
      {hasCredentials ? (
        <CredentialViewer />
      ) : (
        <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-gray-50 text-center">
          <FilePlus2 className="h-12 w-12 text-gray-400 mb-3" />
          <h3 className="font-medium text-gray-700 mb-2">尚未持有任何憑證</h3>
          <p className="text-sm text-gray-500 mb-4">
            您可以掃描 QR 碼或輸入憑證領取連結來獲取憑證
          </p>
          <Link to="/scan">
            <Button>開始領取憑證</Button>
          </Link>
        </div>
      )}
    </div>
  );
};