import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { decodeSDJWT, parseDisclosures, DisclosureField } from '@/utils/sd-jwt';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Eye, Share2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const CredentialDetailPage = () => {
  const { encodedJwt } = useParams<{ encodedJwt: string }>();
  const navigate = useNavigate();
  const [credentials, setCredentials] = useLocalStorage<string[]>('walletCredentials', []);
  const [credential, setCredential] = useState<any>(null);
  const [disclosures, setDisclosures] = useState<DisclosureField[]>([]);
  const [selectedDisclosures, setSelectedDisclosures] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [expandedFields, setExpandedFields] = useState<string[]>([]);

  useEffect(() => {
    if (!encodedJwt) {
      navigate('/credentials');
      return;
    }

    const loadCredential = async () => {
      try {
        const decodedJwt = decodeURIComponent(encodedJwt);
        const decoded = await decodeSDJWT(decodedJwt);

        if (!decoded) {
          throw new Error('無法解析憑證');
        }

        setCredential(decoded);

        // 解析所有欄位
        const fields = parseDisclosures(decodedJwt);
        setDisclosures(fields);

        // 初始化選中欄位
        setSelectedDisclosures(fields.map(f => f.key));
      } catch (e) {
        console.error('載入憑證詳情失敗:', e);
        navigate('/credentials');
      }
    };

    loadCredential();
  }, [encodedJwt, navigate]);

  // 切換欄位選擇
  const toggleField = (key: string) => {
    setSelectedDisclosures(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  // 展開/收合欄位詳情
  const toggleExpand = (key: string) => {
    setExpandedFields(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  // 刪除憑證
  const deleteCredential = () => {
    try {
      const updatedCredentials = credentials.filter(c => c !== credential.rawCredential);
      setCredentials(updatedCredentials);
      navigate('/credentials');
    } catch (e) {
      console.error('刪除憑證失敗:', e);
    }
  };

  if (!credential) {
    return (
      <div className="flex justify-center items-center p-10">
        <span className="text-gray-500">載入中...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/credentials')}
          className="mr-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">憑證詳情</h1>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {credential.id.split('/').pop() || '憑證'}
          </CardTitle>

          <div className="flex flex-wrap gap-1 mt-2 mb-2">
            {credential.types && credential.types.map((type: string, i: number) => (
              <Badge key={i} variant={type === 'VerifiableCredential' ? 'outline' : 'secondary'}>
                {type}
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">發行者: </span>
              <span className="text-gray-600">{credential.issuer}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium">發行日期: </span>
              <span className="text-gray-600">
                {new Date(credential.issuanceDate).toLocaleDateString('zh-TW')}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium">持有者: </span>
              <span className="text-gray-600 truncate w-full block overflow-hidden text-ellipsis whitespace-nowrap">
                {credential.subjectId}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold mb-3">選擇性揭露欄位</h2>
      <p className="text-sm text-gray-500 mb-4">
        勾選要對驗證方揭露的欄位，點擊欄位可查看更多技術細節
      </p>

      <Card className="mb-6">
        <CardContent className="pt-4">
          {disclosures.length > 0 ? (
            <div className="space-y-2">
              {disclosures.map((field, index) => {
                const isExpanded = expandedFields.includes(field.key);

                return (
                  <div key={index} className="border rounded-md">
                    <div className="flex items-start p-3">
                      {/* 選擇框 */}
                      <Checkbox
                        id={`field-${index}`}
                        checked={selectedDisclosures.includes(field.key)}
                        onCheckedChange={() => toggleField(field.key)}
                        className="mt-1 mr-2"
                      />

                      {/* 欄位資訊 */}
                      <div className="flex-1">
                        <div
                          className="flex justify-between items-center cursor-pointer"
                          onClick={() => toggleExpand(field.key)}
                        >
                          <Label htmlFor={`field-${index}`} className="text-sm font-medium cursor-pointer">
                            {field.key}
                          </Label>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>

                        <div className="text-gray-600 text-sm mt-1">
                          <span className="font-medium">value: </span>
                          <span className="break-all">
                            {typeof field.value === 'object'
                              ? JSON.stringify(field.value)
                              : String(field.value)}
                          </span>
                        </div>

                        {/* 展開的技術詳情 */}
                        {isExpanded && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-2">
                            <div>
                              <span className="font-medium">salt: </span>
                              <span className="break-all font-mono">{field.salt}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 p-4 text-center">
              此憑證沒有可選擇性揭露的欄位
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex space-x-2 justify-between">
        <Button
          variant="destructive"
          onClick={() => setShowDeleteDialog(true)}
          className="flex items-center gap-1"
        >
          <Trash2 className="h-4 w-4" />
          <span>刪除憑證</span>
        </Button>

        <div className="flex space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-1"
              >
                <Share2 className="h-4 w-4" />
                <span>出示憑證</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>憑證出示</DialogTitle>
                <DialogDescription>
                  將會將選定欄位提供給驗證方
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <h3 className="text-sm font-medium mb-2">以下欄位將被揭露</h3>
                <div className="border rounded p-3 space-y-2 max-h-[200px] overflow-y-auto">
                  {selectedDisclosures.length > 0 ? (
                    selectedDisclosures.map((key, index) => {
                      const field = disclosures.find(d => d.key === key);
                      return (
                        <div key={index} className="text-sm">
                          <div className="font-medium">{key}</div>
                          {field && (
                            <div className="text-gray-600 text-xs mt-1">
                              <span>
                                {typeof field.value === 'object'
                                  ? JSON.stringify(field.value)
                                  : String(field.value)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm">
                      未選擇任何欄位，請至少選擇一個欄位進行揭露。
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => navigate('/present', {
                    state: {
                      jwt: credential.rawCredential,
                      selectedDisclosures
                    }
                  })}
                  disabled={selectedDisclosures.length === 0}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  生成驗證連結
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 刪除確認對話框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>確認刪除</DialogTitle>
            <DialogDescription>
              您確定要刪除此憑證嗎？此操作無法撤銷。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={deleteCredential}>
              確認刪除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};