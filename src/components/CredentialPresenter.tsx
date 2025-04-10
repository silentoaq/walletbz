import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { parseJwt, parseDisclosures, DisclosureField, rebuildSDJWT } from "@/utils/sd-jwt";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// OID4VP 請求介面
interface OID4VPRequest {
  // 演示定義描述了所需的憑證類型和限制
  presentation_definition: {
    id: string;
    input_descriptors: Array<{
      id: string;
      name: string;
      purpose?: string;
      constraints?: {
        fields: Array<{
          path: string[];
          filter?: {
            type: string;
            pattern: string;
          };
        }>;
      };
    }>;
  };
  // OID4VP 規範的必要欄位
  response_type: string;
  response_mode?: string;
  client_id: string;
  nonce: string;
  state: string;
  redirect_uri?: string;
  response_uri: string; // 用於提交 VP 的端點
}

/**
 * 憑證出示元件
 * 處理 OID4VP 流程及選擇性揭露
 */
export const CredentialPresenter = ({ vpRequestUri }: { vpRequestUri: string }) => {
  const [vpRequest, setVpRequest] = useState<OID4VPRequest | null>(null);
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
        //console.log("收到OID4VP請求:", data);
      } catch (e) {
        setError('無法讀取出示請求');
        //console.error('無法取得 VP 請求:', e);
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
  
  // 提交 VP (OID4VP 格式)
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
      
      //console.log(`準備提交憑證，揭露 ${selectedFields.length} 個欄位`);
      
      // 構建符合 OID4VP 規範的請求主體
      const requestBody = {
        // VP Token 是核心的憑證數據
        vp_token: presentationJwt,
        // 將請求中的 state 原樣返回，用於防止跨站請求
        state: vpRequest.state,
        // 描述提交的 VP 數據格式和結構
        presentation_submission: {
          id: `presentation-${Date.now()}`,
          definition_id: vpRequest.presentation_definition.id,
          descriptor_map: [{
            id: credentialId,
            format: 'vc+sd-jwt',
            path: '$'
          }]
        }
      };
      
      //console.log("發送VP回應:", requestBody);
      //console.log("回應端點:", vpRequest.response_uri);
      
      // 提交到 OID4VP 的 response_uri 端點
      const response = await fetch(vpRequest.response_uri, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        //console.error("提交失敗:", await response.text());
        throw new Error(`提交失敗: ${response.status} ${response.statusText}`);
      }
      
      setSuccess(true);
    } catch (e) {
      //console.error('提交憑證失敗:', e);
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
  
  // 獲取請求來源網域
  const getDomain = () => {
    if (!vpRequest) return '';
    return vpRequest.client_id.split(':').pop() || vpRequest.client_id;
  };
  
  // 獲取憑證類型要求
  const getCredentialTypes = () => {
    if (!vpRequest || !vpRequest.presentation_definition.input_descriptors) return [];
    // 從 input_descriptors 中提取需要的憑證類型
    return vpRequest.presentation_definition.input_descriptors.map(d => d.name);
  };
  
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
              <div><span className="font-medium">來源網域:</span> {getDomain()}</div>
              
              <div>
                <span className="font-medium">請求類型:</span> 
                <span className="ml-1 text-blue-600">OID4VP</span>
              </div>
              
              {getCredentialTypes().length > 0 && (
                <div>
                  <span className="font-medium">憑證類型:</span> 
                  <span className="ml-1">{getCredentialTypes().join(', ')}</span>
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