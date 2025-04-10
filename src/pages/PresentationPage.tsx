import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CredentialPresenter } from '@/components/CredentialPresenter';
import { ChevronLeft, ScanLine } from 'lucide-react';
import { rebuildSDJWT } from '@/utils/sd-jwt';

export const PresentationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [vpRequestUri, setVpRequestUri] = useState<string>('');
  const [credentialData, setCredentialData] = useState<{
    jwt: string;
    selectedDisclosures: string[];
  } | null>(null);
  
  // 從URL參數或location state獲取資料
  useEffect(() => {
    // 1. 檢查是否有來自詳情頁的憑證資料
    if (location.state && location.state.jwt) {
      setCredentialData({
        jwt: location.state.jwt,
        selectedDisclosures: location.state.selectedDisclosures || []
      });
    }
    
    // 2. 從URL params獲取VP請求URI
    const params = new URLSearchParams(location.search);
    const uri = params.get('request_uri');
    if (uri) {
      setVpRequestUri(uri);
    }
  }, [location]);
  
  // 如果同時有憑證資料和VP請求URI，生成並提交VP
  useEffect(() => {
    const presentCredential = async () => {
      if (!credentialData || !vpRequestUri) return;
      
      try {
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
        
        // 提交憑證 - 使用 OID4VP 格式
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
        
        if (!submitResponse.ok) throw new Error('提交憑證失敗');
        
        // 提示成功
        alert('憑證出示成功！');
        navigate('/credentials');
        
      } catch (error) {
        console.error('出示憑證過程中發生錯誤:', error);
        alert('出示憑證失敗，請稍後再試。');
      }
    };
    
    presentCredential();
  }, [credentialData, vpRequestUri, navigate]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 重定向到同一頁面，但帶上request_uri參數
    navigate(`/present?request_uri=${encodeURIComponent(vpRequestUri)}`);
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
      
      {!vpRequestUri ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    輸入VP請求連結
                  </label>
                  <div className="flex space-x-2">
                    <Input 
                      value={vpRequestUri}
                      onChange={(e) => setVpRequestUri(e.target.value)}
                      placeholder="https://example.com/oid4vp/request/123"
                      className="flex-1"
                      required
                    />
                    <Button type="submit">處理</Button>
                  </div>
                </div>
              </form>
              
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">或者</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full py-8 flex flex-col items-center justify-center"
                onClick={() => alert('掃描功能即將推出')}
              >
                <ScanLine className="h-10 w-10 mb-2 text-gray-400" />
                <span>掃描驗證方的 QR 碼</span>
              </Button>
            </CardContent>
          </Card>
          
          <div className="text-sm text-gray-500 text-center mt-4">
            掃描或輸入驗證方提供的請求連結，出示您的憑證
          </div>
        </div>
      ) : (
        <CredentialPresenter vpRequestUri={vpRequestUri} />
      )}
    </div>
  );
};