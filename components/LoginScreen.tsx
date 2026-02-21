import React, { useState } from 'react';
import { playUISound } from '../utils/audio';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => void;
  onRegister: (username: string, password: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onRegister }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }
    if (username.length > 10) {
      setError('用户名不能超过10个字符');
      return;
    }
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }
    if (password.length < 4) {
      setError('密码至少需要4个字符');
      return;
    }

    playUISound('CLICK');
    if (isRegistering) {
      onRegister(username.trim(), password.trim());
    } else {
      onLogin(username.trim(), password.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <h1 className="text-3xl font-black text-center text-orange-600 mb-2">Q-Fight Master</h1>
        <p className="text-center text-slate-500 mb-8 text-sm font-bold uppercase tracking-widest">
          {isRegistering ? 'Create Account' : 'Enter the Arena'}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-bold text-slate-700 mb-2 uppercase">
              账号
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-500 focus:outline-none font-bold text-slate-800 placeholder-slate-300 transition-colors"
              placeholder="请输入用户名"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-2 uppercase">
              密码
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-orange-500 focus:outline-none font-bold text-slate-800 placeholder-slate-300 transition-colors"
              placeholder="请输入密码"
            />
          </div>

          {error && <p className="mt-2 text-sm text-red-500 font-bold animate-shake">{error}</p>}

          <button
            type="submit"
            className={`w-full py-4 rounded-xl text-lg font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
              isRegistering 
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            <span>{isRegistering ? '注册并开始' : '登录'}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            {isRegistering ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
