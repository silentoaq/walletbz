import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { usePhantomWallet } from '@/hooks/usePhantomWallet';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  ScanBarcode, 
  FileDigit, 
  UserCircle,
  LogOut 
} from 'lucide-react';

export const Layout = () => {
  const { wallet, connect, disconnect } = usePhantomWallet();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  
  // 處理頂部導航欄滾動效果
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // 若未連接錢包且不在登入頁面，導向登入頁
  useEffect(() => {
    // 使用 useLocation 代替直接訪問 window.location
    const path = window.location.pathname;
    // 添加一個狀態標記來防止重複導航
    const shouldRedirect = !wallet.connected && path !== '/login' && path !== '/';
    
    // 使用 ref 追蹤是否已經導航
    if (shouldRedirect) {
      // 只有在確實需要導航時才執行
      navigate('/login', { replace: true }); // 使用 replace 而不是 push
    }
  }, [wallet.connected, navigate]);
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* 頂部導航欄 */}
      <header 
        className={`sticky top-0 z-50 w-full border-b transition-all duration-200 ${
          scrolled ? 'bg-white/80 backdrop-blur-md' : 'bg-white'
        }`}
      >
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-blue-600" />
            <Link to="/" className="font-bold text-xl">
              walletbz
            </Link>
          </div>
          
          {wallet.connected ? (
            <div className="flex items-center gap-4">
              <div className="hidden md:block text-sm text-gray-500 truncate max-w-[120px]">
                {wallet.did?.split(':').pop()}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => disconnect()}
                title="登出"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => connect()}
              disabled={wallet.connecting}
            >
              {wallet.connecting ? '連接中...' : '連接錢包'}
            </Button>
          )}
        </div>
      </header>
      
      {/* 主要內容區 */}
      <main className="flex-1 container px-4 py-4 md:py-6">
        <Outlet />
      </main>
      
      {/* 底部導航欄 */}
      {wallet.connected && (
        <nav className="sticky bottom-0 border-t bg-white">
          <div className="container mx-auto">
            <div className="flex justify-around">
              <NavItem to="/home" icon={<UserCircle />} label="首頁" />
              <NavItem to="/scan" icon={<ScanBarcode />} label="掃描" />
              <NavItem to="/credentials" icon={<FileDigit />} label="憑證" />
            </div>
          </div>
        </nav>
      )}
    </div>
  );
};

type NavItemProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
};

const NavItem = ({ to, icon, label }: NavItemProps) => {
  const isActive = window.location.pathname === to;
  
  return (
    <Link to={to} className="w-full">
      <div 
        className={`flex flex-col items-center py-3 ${
          isActive ? 'text-blue-600' : 'text-gray-500'
        }`}
      >
        {icon}
        <span className="text-xs mt-1">{label}</span>
      </div>
    </Link>
  );
};