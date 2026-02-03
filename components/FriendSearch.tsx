
import React from 'react';

interface FriendSearchProps {
  onSearch: () => void;
  searching: boolean;
}

const FriendSearch: React.FC<FriendSearchProps> = ({ onSearch, searching }) => {
  return (
    <div className="mb-8 bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="text-center md:text-left">
        <h3 className="text-lg font-black text-slate-800">寻访豪杰</h3>
        <p className="text-xs text-slate-400 font-medium">在茫茫江湖中寻觅实力相当的对手添加为好友</p>
      </div>
      <button 
        onClick={onSearch}
        disabled={searching}
        className={`w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-10 py-3.5 rounded-2xl font-black shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2`}
      >
        {searching ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            寻访中...
          </>
        ) : (
          '寻访名师'
        )}
      </button>
    </div>
  );
};

export default FriendSearch;
