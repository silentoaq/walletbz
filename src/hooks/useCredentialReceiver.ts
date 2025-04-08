import { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Credential Offer 回應格式
interface CredentialOfferResponse {
  credential_issuer: string;
  credential_configuration_ids: string[];
  grants: {
    'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
      'pre-authorized_code': string;
      'user_pin_required': boolean;
    };
  };
}

// 憑證回應格式
interface CredentialResponse {
  format: string;
  credential: string;
}

// 憑證接收的狀態
interface CredentialReceiverState {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  credential: string | null;
}

/**
 * 憑證領取 Hook
 * 處理 OID4VCI 預授權碼流程
 */
export const useCredentialReceiver = (did: string | null) => {
  const [credentials, setCredentials] = useLocalStorage<string[]>('walletCredentials', []);
  const [state, setState] = useState<CredentialReceiverState>({
    isLoading: false,
    error: null,
    success: false,
    credential: null,
  });

  // 處理憑證領取 URI
  const processCredentialOffer = async (offerUri: string) => {
    try {
      setState({ isLoading: true, error: null, success: false, credential: null });
      
      if (!did) {
        throw new Error('請先連接錢包獲取 DID');
      }
      
      // 確保 URI 是完整的 URL
      let offerEndpoint = offerUri;
      
      // 發送請求獲取憑證領取詳情
      const response = await fetch(offerEndpoint);
      if (!response.ok) {
        throw new Error(`請求失敗: ${response.status} ${response.statusText}`);
      }
      
      const offerData: CredentialOfferResponse = await response.json();
      
      // 檢查是否包含預授權碼
      if (!offerData.grants || 
          !offerData.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code'] ||
          !offerData.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code']) {
        throw new Error('無效的憑證領取資訊');
      }
      
      // 提取憑證發行者端點和預授權碼
      const issuer = offerData.credential_issuer;
      const code = offerData.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
      
      console.log(`準備領取憑證，發行者: ${issuer}，預授權碼: ${code}`);
      
      // 發送領取憑證請求
      const credentialResponse = await fetch(`${issuer}/oid4vci/credential`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'pre-authorized_code': code,
          'subject_did': did,
        }),
      });
      
      if (!credentialResponse.ok) {
        throw new Error(`領取憑證失敗: ${credentialResponse.status} ${credentialResponse.statusText}`);
      }
      
      const credentialData: CredentialResponse = await credentialResponse.json();
      
      if (!credentialData.credential) {
        throw new Error('憑證資料格式錯誤');
      }
      
      console.log('成功接收憑證');
      
      // 使用 hook 更新憑證列表
      setCredentials([...credentials, credentialData.credential]);
      
      setState({
        isLoading: false,
        error: null,
        success: true,
        credential: credentialData.credential,
      });
      
    } catch (error) {
      console.error('處理憑證領取失敗:', error);
      setState({
        isLoading: false,
        error: error instanceof Error ? error.message : '領取憑證時發生未知錯誤',
        success: false,
        credential: null,
      });
    }
  };

  return {
    state,
    processCredentialOffer,
  };
};