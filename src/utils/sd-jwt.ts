/**
 * SD-JWT 工具函數
 * 用於處理 Selective Disclosure JWT 格式的憑證
 */

// 解碼後的憑證資訊
export interface DecodedCredential {
  id: string;
  issuer: string;
  issuanceDate: string;
  subjectId: string;
  types: string[];
  disclosedClaims: Record<string, any>;
  undisclosedKeys: string[];
  rawCredential: string;
}

// 揭露欄位完整資訊
export interface DisclosureField {
  salt: string;
  key: string;
  value: any;
  disclosure: string;
}

// Base64Url 解碼
export const base64UrlDecode = (input: string): string => {
  // 替換非 URL 兼容字符為 Base64 標準字符
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  // 補全 '=' 字元
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  // 解碼
  return atob(padded);
};

// 解析 JWT 部分
export const parseJwt = (jwt: string): any => {
  const [, payloadBase64] = jwt.split('.');
  if (!payloadBase64) return null;
  return JSON.parse(base64UrlDecode(payloadBase64));
};

// 解析單個 disclosure
export const parseDisclosure = (disclosure: string): DisclosureField | null => {
  try {
    const decoded = JSON.parse(base64UrlDecode(disclosure));
    
    // 確保包含必要欄位
    if (!decoded.salt || !decoded.key) {
      console.warn('揭露欄位缺少必要資訊:', decoded);
    }
    
    return {
      salt: decoded.salt || '',
      key: decoded.key || '',
      value: decoded.value,
      disclosure
    };
  } catch (e) {
    console.error('解析揭露欄位失敗:', e);
    return null;
  }
};

// 從 SD-JWT 解析所有 disclosures
export const parseDisclosures = (sdJwt: string): DisclosureField[] => {
  const parts = sdJwt.split('~');
  if (parts.length <= 1) return [];
  
  const disclosures = parts.slice(1);
  return disclosures
    .map(parseDisclosure)
    .filter(Boolean) as DisclosureField[];
};

// 解碼整個 SD-JWT
export const decodeSDJWT = (sdJwt: string): DecodedCredential | null => {
  try {
    // 分離 JWT 和 disclosures
    const [jwt, ...disclosureParts] = sdJwt.split('~');
    
    // 解析 JWT
    const payload = parseJwt(jwt);
    if (!payload || !payload.vc) {
      console.error('JWT 格式不正確或缺少 VC 欄位');
      return null;
    }
    
    const vc = payload.vc;
    const credentialSubject = vc.credentialSubject || {};
    
    // 解析 disclosures
    const disclosureFields = disclosureParts
      .map(parseDisclosure)
      .filter(Boolean) as DisclosureField[];
    
    // 解析揭露的聲明
    const disclosedClaims: Record<string, any> = {};
    disclosureFields.forEach(field => {
      disclosedClaims[field.key] = field.value;
    });
    
    // 找出未揭露的鍵
    const undisclosedKeys: string[] = [];
    if (credentialSubject._sd) {
      // 在實際實現中，我們會使用 sd_hash 與揭露內容比對
      // 為了簡化，這裡僅計數未揭露欄位
      undisclosedKeys.push(...Array(credentialSubject._sd.length)
        .fill(0)
        .map((_, i) => `未揭露欄位_${i+1}`));
    }
    
    // 加入直接包含的聲明
    Object.entries(credentialSubject).forEach(([key, value]) => {
      if (key !== '_sd' && key !== 'id') {
        disclosedClaims[key] = value;
      }
    });
    
    return {
      id: vc.id || '未指定ID',
      issuer: vc.issuer || '未知發行者',
      issuanceDate: vc.issuanceDate || new Date().toISOString(),
      subjectId: credentialSubject.id || '未知持有者',
      types: vc.type || ['VerifiableCredential'],
      disclosedClaims,
      undisclosedKeys,
      rawCredential: sdJwt,
    };
  } catch (error) {
    console.error('解碼 SD-JWT 失敗:', error);
    return null;
  }
};

// 使用選定的欄位重建 SD-JWT
export const rebuildSDJWT = (sdJwt: string, selectedKeys: string[]): string => {
  const [jwt, ...disclosures] = sdJwt.split('~');
  
  // 解析所有揭露欄位
  const disclosureFields = disclosures
    .map(parseDisclosure)
    .filter(Boolean) as DisclosureField[];
  
  // 根據選定的鍵過濾揭露欄位
  const selectedDisclosures = disclosureFields
    .filter(field => selectedKeys.includes(field.key))
    .map(field => field.disclosure);
  
  // 重建 SD-JWT
  return [jwt, ...selectedDisclosures].join('~');
};