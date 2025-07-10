import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { decodeSDJWT, DecodedCredential, parseDisclosures } from "@/utils/sd-jwt";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export const CredentialViewer = () => {
  const [credentials] = useLocalStorage<string[]>('walletCredentials', []);
  const [decodedCredentials, setDecodedCredentials] = useState<DecodedCredential[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const decodeCredentials = async () => {
      try {
        const decoded = await Promise.all(
          credentials.map(async (cred: string) => {
            const result = await decodeSDJWT(cred);
            if (!result) {
              console.warn('無法解析憑證:', cred.substring(0, 50));
            }
            return result;
          })
        );

        setDecodedCredentials(decoded.filter(Boolean) as DecodedCredential[]);
      } catch (e) {
        console.error('載入憑證失敗:', e);
      } finally {
        setLoading(false);
      }
    };

    decodeCredentials();
  }, [credentials]);

  if (loading) {
    return <div className="flex justify-center p-6">載入中...</div>;
  }

  if (decodedCredentials.length === 0) {
    return <div className="flex justify-center p-6">尚未持有憑證</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {decodedCredentials.map((credential, index) => {
        const credentialFields = parseDisclosures(credential.rawCredential);

        return (
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
              {credential.expirationDate && (
                <CardDescription className="text-xs">
                  過期日期: {new Date(credential.expirationDate).toLocaleDateString('zh-TW')}
                </CardDescription>)}
            </CardHeader>

            <CardContent>
              <h4 className="text-sm font-semibold mb-2">憑證欄位</h4>
              {credentialFields.length > 0 ? (
                <div className="space-y-1">
                  {credentialFields.map((field, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="font-medium">{field.key}:</span>
                      <span className="text-gray-600">
                        {typeof field.value === 'object'
                          ? JSON.stringify(field.value)
                          : String(field.value)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">無憑證欄位</p>
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
        );
      })}
    </div>
  );
};