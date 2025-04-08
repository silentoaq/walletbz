import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { decodeSDJWT, DecodedCredential } from "@/utils/sd-jwt";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export const CredentialViewer = () => {
  const [credentials] = useLocalStorage<string[]>('walletCredentials', []);
  const [decodedCredentials, setDecodedCredentials] = useState<DecodedCredential[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const decodeCredentials = () => {
      try {
        // 解碼每個憑證
        const decoded = credentials
          .map((cred: string) => decodeSDJWT(cred))
          .filter(Boolean) as DecodedCredential[];
        
        setDecodedCredentials(decoded);
      } catch (e) {
        console.error('載入憑證失敗:', e);
      } finally {
        setLoading(false);
      }
    };
    
    decodeCredentials();
  }, [credentials]); // 僅在 credentials 變更時重新解碼
  
  if (loading) {
    return <div className="flex justify-center p-6">載入中...</div>;
  }
  
  if (decodedCredentials.length === 0) {
    return <div className="flex justify-center p-6">尚未持有憑證</div>;
  }
  
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {decodedCredentials.map((credential, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold truncate">
              {credential.id.split('/').pop() || '憑證'}
            </CardTitle>
            <div className="flex flex-wrap gap-1 my-1">
              {credential.types
                .filter(type => type !== 'VerifiableCredential')
                .map((type, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {type.replace(/Credential$/, '')} 
                  </Badge>
                ))}
            </div>
            <CardDescription className="text-xs truncate">
              發行者: {credential.issuer}
            </CardDescription>
            <CardDescription className="text-xs">
              發行日期: {new Date(credential.issuanceDate).toLocaleDateString('zh-TW')}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <h4 className="text-sm font-semibold mb-2">已揭露欄位</h4>
            {Object.keys(credential.disclosedClaims).length > 0 ? (
              <div className="space-y-1">
                {Object.entries(credential.disclosedClaims).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="font-medium">{key}:</span>
                    <span className="text-gray-600">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">無已揭露欄位</p>
            )}
            
            {credential.undisclosedKeys.length > 0 && (
              <>
                <h4 className="text-sm font-semibold mt-4 mb-2">未揭露欄位</h4>
                <div className="flex flex-wrap gap-1">
                  {credential.undisclosedKeys.map((key, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {key}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </CardContent>
          
          <CardFooter className="pt-2 flex justify-end">
            <a 
              href={`/credential/${encodeURIComponent(credential.rawCredential)}`} 
              className="text-xs text-blue-600 hover:underline"
            >
              查看詳情
            </a>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};