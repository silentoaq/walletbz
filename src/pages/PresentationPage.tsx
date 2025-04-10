import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronLeft } from 'lucide-react';
import { CredentialPresenter } from '@/components/CredentialPresenter';
import { QRScanner } from '@/components/QRScanner';
import { rebuildSDJWT } from '@/utils/sd-jwt';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';

export const PresentationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { wallet } = usePhantomWallet();
  const [vpRequestUri, setVpRequestUri] = useState<string>('');
  const [credentialData, setCredentialData] = useState<{
    jwt: string;
    selectedDisclosures: string[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [credentials] = useLocalStorage<string[]>('walletCredentials', []);
  const hasCredentials = credentials.length > 0;
  
  useEffect(() => {
    if (location.state && location.state.jwt) {
      setCredentialData({
        jwt: location.state.jwt,
        selectedDisclosures: location.state.selectedDisclosures || []
      });
    }
    
    const params = new URLSearchParams(location.search);
    const uri = params.get('request_uri');
    if (uri) {
      setVpRequestUri(uri);
    }
  }, [location]);
  
  // 處理從掃描器收到的URI
  const handleScanResult = (uri: string) => {
    setVpRequestUri(uri);
    navigate(`/present?request_uri=${encodeURIComponent(uri)}`, { replace: true });
  };

  // 如果同時有憑證資料和VP請求URI，生成並提交VP
  useEffect(() => {
    const presentCredential = async () => {
      if (!credentialData || !vpRequestUri) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // 獲取VP請求內容
        const response = await fetch(vpRequestUri);
        if (!response.ok) throw new Error('無法獲取VP請求');
        
        const vpRequest = await response.json();
        const responseUri = vpRequest.response_uri;
        
        if (!responseUri) throw new Error('無效的VP請求 - 缺少response_uri');
        
        // 使用選定欄位重建SD-JWT
        const presentationJwt = rebuildSDJWT(
          credentialData.jwt, 
          credentialData.selectedDisclosures
        );
        
        // 提交憑證 
        const submitResponse = await fetch(responseUri, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vp_token: presentationJwt,
            state: vpRequest.state,
            presentation_submission: {
              id: `presentation-${Date.now()}`,
              definition_id: vpRequest.presentation_definition.id,
              descriptor_map: [{
                id: 'credential',
                format: 'vc+sd-jwt',
                path: '$'
              }]
            }
          })
        });
        
        if (!submitResponse.ok) {
          const errorText = await submitResponse.text();
          throw new Error(`提交憑證失敗: ${submitResponse.status} ${errorText.substring(0, 100)}`);
        }
        
        setSuccess(true);
      } catch (error) {
        //console.error('出示憑證過程中發生錯誤:', error);
        setError(error instanceof Error ? error.message : '提交憑證時發生未知錯誤');
      } finally {
        setLoading(false);
      }
    };
    
    presentCredential();
  }, [credentialData, vpRequestUri, navigate]);
  

  const renderContent = () => {
    if (!hasCredentials) {
      return (
        <div className="text-center p-6 bg-gray-50 rounded-lg border border-dashed">
          <p className="text-gray-500 mb-3">您目前沒有可出示的憑證</p>
          <Button variant="outline" onClick={() => navigate('/scan')}>
            前往領取憑證
          </Button>
        </div>
      );
    }
    
    // 如果有錯誤
    if (error) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
          <Button onClick={() => setError(null)} variant="outline" size="sm" className="mt-2">
            重試
          </Button>
        </Alert>
      );
    }
    
    // 如果成功
    if (success) {
      return (
        <Alert className="mb-4 bg-green-50 border-green-300 text-green-800">
          <AlertDescription>憑證已成功提交！</AlertDescription>
          <div className="mt-4 flex justify-center">
            <Button onClick={() => navigate('/home')}>返回首頁</Button>
          </div>
        </Alert>
      );
    }
    
    // 如果正在加載
    if (loading) {
      return (
        <div className="text-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>正在處理您的憑證出示請求...</p>
        </div>
      );
    }
    
    // 如果有VP請求URI
    if (vpRequestUri) {
      return <CredentialPresenter vpRequestUri={vpRequestUri} />;
    }
    
    return (
      <div className="p-2">
        <QRScanner 
          did={wallet.did} 
          mode="present" 
          onSubmit={handleScanResult} 
        />
      </div>
    );
  };
  
  return (
    <div>
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">出示憑證</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>
            {vpRequestUri ? '驗證方請求' : '掃描憑證出示碼'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
};