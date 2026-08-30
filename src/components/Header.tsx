"use client";

import { ArrowLeft, HelpCircle, Bell, Plus, ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface HeaderProps {
  onBack?: () => void;
  actionButton?: React.ReactNode;
}

export default function Header({ onBack, actionButton }: HeaderProps) {
  const toggleSidebar = () => {
    document.dispatchEvent(new CustomEvent('toggle-sidebar'));
  };

  return (
    <header className="px-3 md:px-8 py-3 md:py-4 flex items-center justify-between">
      {/* Container card for mobile floating look */}
      <div className="w-full bg-white md:bg-transparent rounded-2xl md:rounded-none px-4 md:px-0 py-2.5 md:py-0 shadow-sm md:shadow-none flex items-center justify-between">
        
        {/* Left Section */}
        <div className="flex items-center space-x-3 md:space-x-4">
          {onBack && (
            <button onClick={onBack} className="text-zinc-800 hover:text-black p-1" title="Go back">
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
          )}
          
          {/* Mobile VedaAI Logo (Hidden on Desktop) */}
          <div className="flex md:hidden items-center space-x-2">
            <img src="/logo.png" alt="VedaAI" className="w-6 h-6 rounded-md shadow-sm object-cover" />
            <span className="font-bold text-lg tracking-tight text-zinc-900">VedaAI</span>
          </div>

          {/* Desktop "Exams" Text (Hidden on Mobile) */}
          <div className="hidden md:flex items-center space-x-2 text-zinc-500 text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            <span className="font-medium text-zinc-600">Exams</span>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2 md:space-x-6">
          
          {/* Action Button (e.g. Start New Evaluation) */}
          {actionButton && <div className="hidden md:block">{actionButton}</div>}
          
          {/* Desktop Icons */}
          <div className="hidden md:flex items-center space-x-4 text-zinc-600">
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

          {/* Mobile Bell Icon */}
          <button onClick={() => toast("No new notifications", { icon: "🔔" })} className="md:hidden w-8 h-8 rounded-full bg-zinc-100/80 flex items-center justify-center text-zinc-700 hover:text-zinc-900 relative">
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
          
          {/* Profile Avatar */}
          <div onClick={() => toast("Profile settings coming soon!", { icon: "👤" })} className="flex items-center space-x-2 cursor-pointer hover:bg-zinc-50 md:p-1 rounded-lg">
            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-zinc-200 shadow-sm">
               <img src="https://ui-avatars.com/api/?name=Madhur+Rastogi&background=f97316&color=fff" alt="User" className="w-full h-full object-cover" />
            </div>
            <span className="hidden md:block text-sm font-medium text-zinc-800">Madhur Rastogi</span>
            <ChevronDown size={16} className="hidden md:block text-zinc-500" />
          </div>

          {/* Mobile Hamburger */}
          <button 
            onClick={toggleSidebar}
            className="md:hidden text-zinc-700 p-1 hover:text-black"
          >
            <Menu size={22} />
          </button>

        </div>
      </div>
    </header>
  );
}
