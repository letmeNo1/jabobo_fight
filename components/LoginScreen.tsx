import React, { useState } from 'react';
import { playUISound } from '../utils/audio';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => void;
  onRegister: (username: string, password: string) => void;
  loading: boolean; // 🌟 新增：接收加载状态
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onRegister, loading }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // 基础校验
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

    // 加载中不重复提交
    if (loading) return;

    playUISound('CLICK');
    if (isRegistering) {
      onRegister(username.trim(), password.trim());
    } else {
      onLogin(username.trim(), password.trim());
    }
  };

  // 切换登录/注册时清空输入框
  const toggleRegister = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setUsername('');
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-popIn">
        <h1 className="text-3xl font-black text-center text-orange-600 mb-2">Q-Fight Master</h1>
        <p className="text-center text-slate-500 mb-8 text-sm font-bold uppercase tracking-widest">
          {isRegistering ? '创建你的江湖账号' : '进入格斗竞技场'}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <label htmlFor="username" className="block text-sm font-bold text-slate-700 mb-2 uppercase">
              账号
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none font-bold text-slate-800 placeholder-slate-300 transition-colors ${
                error && username.trim() ? 'border-red-500' : 'border-slate-200 focus:border-orange-500'
              }`}
              placeholder="请输入用户名（1-10个字符）"
              autoFocus
              disabled={loading} // 加载中禁用输入
            />
          </div>

          <div className="relative">
            <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-2 uppercase">
              密码
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none font-bold text-slate-800 placeholder-slate-300 transition-colors ${
                error && password.trim() ? 'border-red-500' : 'border-slate-200 focus:border-orange-500'
              }`}
              placeholder="请输入密码（至少4个字符）"
              disabled={loading} // 加载中禁用输入
            />
          </div>

          {/* 错误提示优化 */}
          {error && (
            <div className="mt-2 text-sm text-red-500 font-bold animate-shake bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          {/* 提交按钮优化（加载状态） */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl text-lg font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
              loading 
                ? 'bg-slate-400 text-white cursor-not-allowed' 
                : isRegistering 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isRegistering ? '注册中...' : '登录中...'}
              </>
            ) : (
              <>
                <span>{isRegistering ? '注册并开始' : '登录'}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </>
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={toggleRegister}
            disabled={loading} // 加载中禁止切换
            className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            {isRegistering ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
        </div>
      </div>

      {/* 动画样式 */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes popIn { 
          from { opacity: 0; transform: translateY(20px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        .animate-popIn { animation: popIn 0.4s ease-out forwards; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}} />
    </div>
  );
};

export default LoginScreen;