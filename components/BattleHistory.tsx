
import React from 'react';
import { BattleRecord } from '../types';

interface BattleHistoryProps {
  history: BattleRecord[];
  onPlay: (record: BattleRecord) => void;
  onBack: () => void;
}

const BattleHistory: React.FC<BattleHistoryProps> = ({ history, onPlay, onBack }) => {
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden min-h-[60vh] animate-popIn">
      <div className="p-6 border-b flex justify-between items-center bg-indigo-50">
        <div>
          <h2 className="text-xl font-bold text-indigo-700 italic">江湖战报</h2>
          <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Recent Battles</p>
        </div>
        <button onClick={onBack} className="text-indigo-400 hover:text-indigo-600 font-bold">返回主页</button>
      </div>

      <div className="p-4 space-y-3">
        {history.length > 0 ? (
          history.map(rec => (
            <div key={rec.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-slate-100 transition-colors group">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-lg ${rec.winner === 'P' ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>
                  {rec.winner === 'P' ? '胜' : '负'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">对阵 {rec.opponent.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(rec.timestamp).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-[9px] text-slate-400 font-black uppercase">Result</p>
                  <p className={`text-xs font-black ${rec.winner === 'P' ? 'text-orange-500' : 'text-slate-500'}`}>{rec.turns.length} 回合结束</p>
                </div>
                <button 
                  onClick={() => onPlay(rec)}
                  className="bg-white border border-indigo-200 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                >
                  回放
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="py-24 text-center">
             <div className="text-5xl opacity-20 mb-4">📜</div>
             <p className="text-slate-300 font-bold italic">暂无战斗记录，快去开启对决吧！</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BattleHistory;
