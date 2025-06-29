import { Link } from 'react-router-dom';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ScanBarcode, 
  FileDigit, 
  ChevronRight, 
  FilePlus2 
} from 'lucide-react';
import { decodeSDJWT } from '@/utils/sd-jwt';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

export const HomePage = () => {
  const { wallet } = usePhantomWallet();
  const [credentials] = useLocalStorage<string[]>('walletCredentials', []);
  const credentialCount = credentials.length;
  const [latestCredential, setLatestCredential] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 異步獲取最近的憑證
  useEffect(() => {
    const getLatestCredential = async () => {
      try {
        setLoading(true);
        const storedCredentials = JSON.parse(localStorage.getItem('walletCredentials') || '[]');
        if (storedCredentials.length === 0) {
          setLatestCredential(null);
          return;
        }
        
        const latestCredentialRaw = storedCredentials[storedCredentials.length - 1];
        const decoded = await decodeSDJWT(latestCredentialRaw);
        setLatestCredential(decoded);
      } catch (e) {
        console.error('載入最近憑證失敗:', e);
        setLatestCredential(null);
      } finally {
        setLoading(false);
      }
    };
    
    getLatestCredential();
  }, [credentials]);
  
  return (
    <div className="space-y-6">
      {/* 用戶資訊 */}
      <section className="pb-2">
        <h1 className="text-2xl font-bold mb-2">您好，錢包持有者</h1>
        <div className="text-sm text-gray-500 break-all">
          <div>DID: {wallet.did}</div>
        </div>
      </section>
      
      {/* 主要操作 */}
      <section className="grid grid-cols-2 gap-4">
        <Link to="/scan" className="block">
          <Card className="h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
              <ScanBarcode className="h-10 w-10 text-blue-600 mb-2" />
              <h3 className="font-medium">掃描領取碼</h3>
              <p className="text-xs text-gray-500">領取新憑證</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link to="/credentials" className="block">
          <Card className="h-full">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
              <FileDigit className="h-10 w-10 text-green-600 mb-2" />
              <h3 className="font-medium">我的憑證</h3>
              <p className="text-xs text-gray-500">
                {credentialCount > 0 
                  ? `目前持有 ${credentialCount} 張憑證` 
                  : '尚未持有憑證'}
              </p>
            </CardContent>
          </Card>
        </Link>
      </section>
      
      {/* 最近的憑證 */}
      {!loading && latestCredential && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">最近領取的憑證</h2>
            <Link to="/credentials" className="text-sm text-blue-600 flex items-center">
              查看全部 <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium truncate max-w-[200px]">
                    {latestCredential.id.split('/').pop() || '憑證'}
                  </h3>
                  <div className="flex flex-wrap gap-1 my-1">
                    {latestCredential.types
                      .filter((type: string) => type !== 'VerifiableCredential')
                      .map((type: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {type.replace(/Credential$/, '')}
                        </Badge>
                      ))}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    發行者: {latestCredential.issuer}
                  </p>
                </div>
                
                <Link 
                  to={`/credential/${encodeURIComponent(latestCredential.rawCredential)}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Button variant="ghost" size="icon">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
      
      {/* 載入中 */}
      {loading && credentialCount > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">最近領取的憑證</h2>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
      
      {/* 無憑證提示 */}
      {credentialCount === 0 && (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <FilePlus2 className="h-12 w-12 text-gray-400 mb-3" />
            <h3 className="font-medium text-gray-700">尚未持有任何憑證</h3>
            <p className="text-sm text-gray-500 mb-4">
              點擊下方按鈕開始掃描領取碼，取得您的第一張憑證
            </p>
            <Link to="/scan">
              <Button>開始領取憑證</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};