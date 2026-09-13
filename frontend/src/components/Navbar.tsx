import React from 'react';
import type { User } from '../types/kit';
import { Sparkles, LogOut, User as UserIcon, PlusCircle, FolderKanban } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNewKit: () => void;
  onOpenMyKits: () => void;
  myKitsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenAuth,
  onLogout,
  onNewKit,
  onOpenMyKits,
  myKitsCount
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onNewKit}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Trao PrepKit
            </h1>
            <p className="text-xs text-slate-400 font-medium">AI Interview Intelligence</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {user ? (
            <>
              <button
                onClick={onNewKit}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition shadow-md shadow-blue-600/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden sm:inline">New Kit</span>
              </button>

              <button
                onClick={onOpenMyKits}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition border border-slate-700"
              >
                <FolderKanban className="w-4 h-4 text-blue-400" />
                <span>My Kits</span>
                {myKitsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded-full font-bold">
                    {myKitsCount}
                  </span>
                )}
              </button>

              <div className="h-6 w-px bg-slate-800 mx-1" />

              <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
                <UserIcon className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-300 max-w-[120px] truncate">
                  {user.name || user.email.split('@')[0]}
                </span>
                <button
                  onClick={onLogout}
                  title="Log out"
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition shadow-md shadow-blue-600/20"
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
