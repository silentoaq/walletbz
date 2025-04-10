import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';
import { Button } from '@/components/ui/button';
import { Wallet, Shield, FileCheck } from 'lucide-react';

export const LoginPage = () => {
  const { wallet, connect } = usePhantomWallet();
  const navigate = useNavigate();
  
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (wallet.connected && (currentPath === "/login" || currentPath === "/")) {
      navigate('/home');
    }
  }, [wallet.connected, navigate]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b py-4">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-blue-600" />
            <h1 className="font-bold text-xl">walletbz</h1>
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">
              去中心化身份憑證錢包
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              管理您的數位身份憑證，輕鬆領取與選擇性出示
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <FeatureCard 
                icon={<Shield className="h-6 w-6 text-blue-600" />}
                title="自主掌控"
                description="您的憑證資料完全掌握在自己手中，安全且隱私。"
              />
              
              <FeatureCard 
                icon={<FileCheck className="h-6 w-6 text-green-600" />}
                title="選擇性揭露"
                description="精準控制每次憑證出示時要揭露的個人資訊，最小化資料共享。"
              />
            </div>
            
            <Button 
              onClick={() => connect()} 
              className="w-full py-6"
              disabled={wallet.connecting}
            >
              {wallet.connecting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  連接中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" /> 
                  使用 Phantom 錢包登入
                </span>
              )}
            </Button>
            
            {wallet.error && (
              <p className="text-sm text-red-500 text-center">{wallet.error}</p>
            )}
          </div>
        </div>
      </main>
      
      <footer className="text-center text-xs text-gray-500 py-4">
        &copy; {new Date().getFullYear()} walletbz - 去中心化身份憑證錢包
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = ({ icon, title, description }: FeatureCardProps) => {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-start gap-4">
        <div className="mt-1">{icon}</div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );
};