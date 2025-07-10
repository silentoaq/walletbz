export interface DecodedCredential {
  id: string;
  issuer: string;
  issuanceDate: string;
  expirationDate?: string;
  subjectId: string;
  types: string[];
  disclosedClaims: Record<string, any>;
  undisclosedKeys: string[];
  rawCredential: string;
}

export interface DisclosureField {
  salt: string;
  key: string;
  value: any;
  disclosure: string;
}

export const base64UrlDecode = (input: string): string => {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  return atob(padded);
};

export const base64UrlEncode = (input: string): string => {
  return btoa(input)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

export const parseJwt = (jwt: string): any => {
  const [, payloadBase64] = jwt.split('.');
  if (!payloadBase64) return null;
  return JSON.parse(base64UrlDecode(payloadBase64));
};

export const parseDisclosure = (disclosure: string): DisclosureField | null => {
  try {
    const decoded = JSON.parse(base64UrlDecode(disclosure));
    
    if (!Array.isArray(decoded) || decoded.length !== 3) {
      console.warn('Disclosure 格式不正確，應為 [salt, key, value] 陣列:', decoded);
      return null;
    }
    
    const [salt, key, value] = decoded;
    
    if (!salt || !key) {
      console.warn('揭露欄位缺少必要資訊:', { salt, key, value });
      return null;
    }
    
    return {
      salt: salt,
      key: key,
      value: value,
      disclosure
    };
  } catch (e) {
    console.error('解析揭露欄位失敗:', e);
    return null;
  }
};

const computeDisclosureHash = async (disclosure: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(base64UrlDecode(disclosure));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const hashBase64 = base64UrlEncode(String.fromCharCode(...hashArray));
  return `sha-256:${hashBase64}`;
};

export const parseDisclosures = (sdJwt: string): DisclosureField[] => {
  const parts = sdJwt.split('~');
  if (parts.length <= 1) return [];
  
  const disclosures = parts.slice(1);
  return disclosures
    .map(parseDisclosure)
    .filter(Boolean) as DisclosureField[];
};

export const decodeSDJWT = async (sdJwt: string): Promise<DecodedCredential | null> => {
  try {
    const [jwt, ...disclosureParts] = sdJwt.split('~');
    
    const payload = parseJwt(jwt);
    if (!payload || !payload.vc) {
      console.error('JWT 格式不正確或缺少 VC 欄位');
      return null;
    }
    
    const vc = payload.vc;
    const credentialSubject = vc.credentialSubject || {};
    
    const disclosureFields = disclosureParts
      .map(parseDisclosure)
      .filter(Boolean) as DisclosureField[];
    
    const disclosedClaims: Record<string, any> = {};
    
    // 同步計算所有 disclosure 的哈希值
    const disclosedHashes: string[] = [];
    for (const field of disclosureFields) {
      disclosedClaims[field.key] = field.value;
      try {
        const hash = await computeDisclosureHash(field.disclosure);
        disclosedHashes.push(hash);
      } catch (e) {
        console.warn('計算 disclosure 哈希失敗:', e);
      }
    }
    
    // 找出未揭露的欄位
    const sdHashes: string[] = credentialSubject._sd || [];
    const undisclosedHashes = sdHashes.filter((hash: string) => !disclosedHashes.includes(hash));
    const undisclosedKeys = undisclosedHashes.map((_: string, index: number) => `未揭露欄位_${index + 1}`);
    
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
      expirationDate: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined,
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

export const rebuildSDJWT = (sdJwt: string, selectedKeys: string[]): string => {
  const [jwt, ...disclosures] = sdJwt.split('~');
  
  const disclosureFields = disclosures
    .map(parseDisclosure)
    .filter(Boolean) as DisclosureField[];
  
  const selectedDisclosures = disclosureFields
    .filter(field => selectedKeys.includes(field.key))
    .map(field => field.disclosure);
  
  return [jwt, ...selectedDisclosures].join('~');
};