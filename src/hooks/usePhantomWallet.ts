import { useEffect, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Phantom 錢包擴充視窗類型定義
interface PhantomWindow extends Window {
  phantom?: {
    solana?: {
      isPhantom: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
    };
  };
}

// 錢包狀態介面
interface WalletState {
  connected: boolean;
  publicKey: string | null;
  did: string | null;
  connecting: boolean;
  error: string | null;
}

/**
 * Solana Phantom 錢包連接 Hook
 * 處理錢包連接、DID 生成與驗證
 */
export const usePhantomWallet = () => {
  // 使用 useLocalStorage 保存錢包狀態
  const [isConnected, setIsConnected] = useLocalStorage('walletConnected', false);
  const [storedPublicKey, setStoredPublicKey] = useLocalStorage<string | null>('walletPublicKey', null);
  const [storedDid, setStoredDid] = useLocalStorage<string | null>('walletDid', null);
  
  const [wallet, setWallet] = useState<WalletState>({
    connected: Boolean(isConnected),
    publicKey: storedPublicKey,
    did: storedDid,
    connecting: false,
    error: null,
  });

  // 檢查 Phantom 錢包是否可用
  const getProvider = () => {
    const win = window as unknown as PhantomWindow;
    if ('phantom' in win) {
      const provider = win.phantom?.solana;
      if (provider?.isPhantom) {
        return provider;
      }
    }
    
    // 引導使用者安裝 Phantom 錢包
    window.open('https://phantom.app/', '_blank');
    return null;
  };

  // 將 Solana 公鑰轉換為 DID 格式
  const publicKeyToDid = (publicKey: string): string => {
    return `did:pkh:sol:${publicKey}`;
  };

  // 連接 Phantom 錢包
  const connect = async () => {
    try {
      setWallet(prev => ({ ...prev, connecting: true, error: null }));
      
      const provider = getProvider();
      if (!provider) {
        throw new Error('找不到 Phantom 錢包，請安裝後再試');
      }

      const { publicKey } = await provider.connect();
      const key = publicKey.toString();
      const did = publicKeyToDid(key);
      
      // 透過簽名訊息驗證所有權
      const message = new TextEncoder().encode(`登入 walletbz 憑證錢包 - ${new Date().toISOString()}`);
      await provider.signMessage(message);
      
      // 使用 hook 更新連接狀態
      setIsConnected(true);
      setStoredPublicKey(key);
      setStoredDid(did);
      
      // 更新錢包狀態
      setWallet({
        connected: true,
        publicKey: key,
        did,
        connecting: false,
        error: null,
      });
      
    } catch (error) {
      console.error('連接錢包失敗:', error);
      setWallet(prev => ({
        ...prev,
        connected: false,
        publicKey: null,
        did: null,
        connecting: false,
        error: error instanceof Error ? error.message : '連接錢包時發生未知錯誤',
      }));
      
      // 確保 localStorage 中的狀態與實際狀態一致
      setIsConnected(false);
      setStoredPublicKey(null);
      setStoredDid(null);
    }
  };

  // 斷開 Phantom 錢包連接
  const disconnect = async () => {
    try {
      const provider = getProvider();
      if (provider) {
        await provider.disconnect();
      }
      
      // 使用 hook 清除連接狀態
      setIsConnected(false);
      setStoredPublicKey(null);
      setStoredDid(null);
      
      // 更新錢包狀態
      setWallet({
        connected: false,
        publicKey: null,
        did: null,
        connecting: false,
        error: null,
      });
      
    } catch (error) {
      console.error('斷開錢包連接失敗:', error);
    }
  };

  // 同步 localStorage 狀態到 wallet 狀態
  useEffect(() => {
    setWallet(prev => ({
      ...prev,
      connected: Boolean(isConnected),
      publicKey: storedPublicKey,
      did: storedDid
    }));
  }, [isConnected, storedPublicKey, storedDid]);

  return {
    wallet,
    connect,
    disconnect,
  };
};