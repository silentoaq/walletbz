import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { parseJwt, parseDisclosures, DisclosureField, rebuildSDJWT } from "@/utils/sd-jwt";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// VP 請求介面
interface VPRequest {
  challenge: string;
  domain: string;
  callbackUrl: string;
  credentialTypes?: string[];
}

/**
 * 憑證出示元件
 * 處理 OID4VP 流程及選擇性揭露
 */
export const CredentialPresenter = ({ vpRequestUri }: { vpRequestUri: string }) => {
  const [vpRequest, setVpRequest] = useState<VPRequest | null>(null);
  const [credentials] = useLocalStorage<string[]>('walletCredentials', []);
  const [selectedCredential, setSelectedCredential] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [disclosureFields, setDisclosureFields] = useState<DisclosureField[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // 取得 VP 請求內容
  useEffect(() => {
    const fetchVpRequest = async () => {
      try {
        setLoading(true);
        const response = await fetch(vpRequestUri);
        if (!response.ok) {
          throw new Error(`請求失敗: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setVpRequest(data);
      } catch (e) {
        setError('無法讀取出示請求');
        console.error('無法取得 VP 請求:', e);
      } finally {
        setLoading(false);
      }
    };
    
    if (vpRequestUri) {
      fetchVpRequest();
    } else {
      setLoading(false);
    }
  }, [vpRequestUri]);
  
  // 當憑證被選取時，解析其欄位
  useEffect(() => {
    if (selectedCredential) {
      const fields = parseDisclosures(selectedCredential);
      setDisclosureFields(fields);
      // 默認選中所有欄位
      setSelectedFields(fields.map(field => field.key));
    } else {
      setDisclosureFields([]);
      setSelectedFields([]);
    }
  }, [selectedCredential]);
  
  // 切換欄位選擇
  const toggleField = (key: string) => {
    setSelectedFields(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };
  
  // 提交 VP
  const submitPresentation = async () => {
    if (!vpRequest || !selectedCredential) {
      setError('請選擇憑證');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // 根據選定的欄位重建 SD-JWT
      const presentationJwt = rebuildSDJWT(selectedCredential, selectedFields);
      
      // 從JWT中取得憑證ID以供呈現
      const jwt = selectedCredential.split('~')[0];
      const payload = parseJwt(jwt);
      const credentialId = payload?.vc?.id || 'credential';
      
      console.log(`準備提交憑證，揭露 ${selectedFields.length} 個欄位`);
      
      // 提交到回調 URL
      const response = await fetch(vpRequest.callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vp: presentationJwt,
          presentation_submission: {
            id: `presentation-${Date.now()}`,
            definition_id: 'credential-presentation',
            descriptor_map: [{
              id: credentialId,
              format: 'vc+sd-jwt',
              path: '$',
            }]
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`提交失敗: ${response.status} ${response.statusText}`);
      }
      
      setSuccess(true);
    } catch (e) {
      console.error('提交憑證失敗:', e);
      setError(e instanceof Error ? e.message : '提交憑證時發生未知錯誤');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return <div className="p-4 text-center">載入中...</div>;
  }
  
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertTitle>錯誤</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => window.history.back()}>返回</Button>
        </div>
      </div>
    );
  }
  
  if (success) {
    return (
      <div className="p-4">
        <Alert>
          <AlertTitle>成功</AlertTitle>
          <AlertDescription>憑證已成功提交！</AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button onClick={() => window.history.back()}>返回</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">憑證出示請求</h2>
      
      {vpRequest && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-md">請求資訊</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2">
              <div><span className="font-medium">來源網域:</span> {vpRequest.domain}</div>
              {vpRequest.credentialTypes && (
                <div>
                  <span className="font-medium">憑證類型:</span> 
                  {vpRequest.credentialTypes.join(', ')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="mb-4">
        <h3 className="text-md font-semibold mb-2">選擇憑證</h3>
        {credentials.length > 0 ? (
          <RadioGroup
            value={selectedCredential || ''}
            onValueChange={setSelectedCredential}
            className="space-y-2"
          >
            {credentials.map((credential, index) => {
              // 提取簡化的 ID 進行顯示
              const jwt = credential.split('~')[0];
              const payload = parseJwt(jwt);
              let displayName = `憑證 ${index + 1}`;
              
              if (payload?.vc?.id) {
                displayName = payload.vc.id.split('/').pop() || displayName;
              }
              
              return (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={credential} id={`credential-${index}`} />
                  <Label htmlFor={`credential-${index}`} className="text-sm">
                    {displayName}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        ) : (
          <div className="text-sm text-gray-500">尚無可用憑證</div>
        )}
      </div>
      
      {selectedCredential && disclosureFields.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-semibold mb-2">選擇要揭露給驗證方的欄位</h3>
          <div className="space-y-2 border rounded p-3">
            {disclosureFields.map((field, index) => (
              <div key={index} className="flex items-start space-x-2 py-2 border-b last:border-b-0">
                <Checkbox
                  id={`field-${index}`}
                  checked={selectedFields.includes(field.key)}
                  onCheckedChange={() => toggleField(field.key)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor={`field-${index}`} className="text-sm">
                    <div className="font-medium mb-1">{field.key}</div>
                    <div className="text-gray-600 text-xs">
                      {typeof field.value === 'object' 
                        ? JSON.stringify(field.value) 
                        : String(field.value)}
                    </div>
                  </Label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => window.history.back()}>
          取消
        </Button>
        <Button 
          onClick={submitPresentation} 
          disabled={!selectedCredential || submitting || selectedFields.length === 0}
        >
          {submitting ? '提交中...' : '提交憑證'}
        </Button>
      </div>
    </div>
  );
};