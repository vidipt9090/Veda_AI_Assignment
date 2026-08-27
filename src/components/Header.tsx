"use client";

import { ArrowLeft, HelpCircle, Bell, Plus, ChevronDown } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface HeaderProps {
  onBack?: () => void;
  actionButton?: React.ReactNode;
}

export default function Header({ onBack, actionButton }: HeaderProps) {
  return (
    <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        {onBack && (
          <button onClick={onBack} className="text-zinc-500 hover:text-zinc-900" title="Go back">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="flex items-center space-x-2 text-zinc-500 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          <span className="font-medium">Exams</span>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        {actionButton && <div>{actionButton}</div>}
        <div className="flex items-center space-x-4 text-zinc-600">
          <button onClick={() => toast("Help Center coming soon!", { icon: "💡" })} className="hover:text-zinc-900">
            <HelpCircle size={20} />
          </button>
          <button onClick={() => toast("No new notifications", { icon: "🔔" })} className="hover:text-zinc-900 relative">
            <Bell size={20} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
          <button onClick={() => toast("Feature coming soon!", { icon: "✨" })} className="hover:text-zinc-900">
            <Plus size={20} />
          </button>
        </div>
        
        <div onClick={() => toast("Profile settings coming soon!", { icon: "👤" })} className="flex items-center space-x-2 cursor-pointer hover:bg-zinc-50 p-1 rounded-lg">
          <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center overflow-hidden">
             <div className="w-full h-full bg-orange-400"></div>
          </div>
          <span className="text-sm font-medium">Madhur Rastogi</span>
          <ChevronDown size={16} className="text-zinc-500" />
        </div>
      </div>
    </header>
  );
}
