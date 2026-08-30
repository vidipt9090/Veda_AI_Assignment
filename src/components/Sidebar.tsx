"use client";

import { Home, Users, FileText, FileSpreadsheet, Clock, Settings, Menu, X, ChevronsRight } from "lucide-react";
import toast from "react-hot-toast";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handleToggle = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 1024) {
          setIsMobileOpen(prev => !prev);
        } else {
          setIsCollapsed(prev => !prev);
        }
      }
    };
    document.addEventListener('toggle-sidebar', handleToggle);
    return () => document.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside 
        className={`fixed lg:sticky top-0 left-0 h-full lg:h-[calc(100vh-1.5rem)] my-0 lg:my-3 lg:ml-3 bg-white rounded-r-3xl lg:rounded-3xl shadow-[0_15px_35px_rgba(0,0,0,0.1),0_5px_15px_rgba(0,0,0,0.05)] border border-zinc-200/60 flex flex-col justify-between z-50 transition-all duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-[72px] lg:p-3 items-center' : 'w-64 p-5'}
        `}
      >
        {isCollapsed ? (
          /* Minimized Icon-Only Sidebar View */
          <>
            <div className="flex flex-col items-center space-y-6 w-full">
              {/* Logo */}
              <button 
                onClick={() => setIsCollapsed(false)}
                className="w-9 h-9 flex items-center justify-center hover:opacity-80 transition-opacity"
                title="Expand Sidebar"
              >
                <img src="/logo.png" alt="VedaAI" className="w-8 h-8 rounded-lg shadow-sm object-cover" />
              </button>

              {/* AI Toolkit Icon Button */}
              <div className="p-[1.5px] bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-full shadow-sm">
                <button 
                  onClick={() => toast("AI Teacher's Toolkit is already active!", { icon: "✨" })}
                  className="w-9 h-9 bg-zinc-900 text-white rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors"
                  title="AI Teacher's Toolkit"
                >
                  <span className="text-xs">✦</span>
                </button>
              </div>

              {/* Navigation Icons */}
              <nav className="flex flex-col items-center space-y-3 w-full">
                <MiniNavItem icon={<Home size={18} />} label="Home" />
                <MiniNavItem icon={<Users size={18} />} label="My Classroom" />
                <MiniNavItem icon={<FileText size={18} />} label="Assignments" />
                <MiniNavItem icon={<FileSpreadsheet size={18} />} label="Exams" active />
                <MiniNavItem icon={<Clock size={18} />} label="My Library" />
              </nav>
            </div>

            {/* Bottom School Icon & Expand Arrow */}
            <div className="flex flex-col items-center space-y-4 w-full">
              <div 
                className="w-9 h-9 bg-zinc-100/80 rounded-xl flex items-center justify-center border border-zinc-200/60 shadow-sm cursor-pointer"
                title="Delhi Public School, Bokaro Steel City"
              >
                <span className="font-bold text-[10px] text-green-800">DPS</span>
              </div>
              <button 
                onClick={() => setIsCollapsed(false)}
                className="p-2 text-zinc-400 hover:text-zinc-800 rounded-lg hover:bg-zinc-100 transition-colors"
                title="Expand Sidebar"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </>
        ) : (
          /* Full Width Sidebar View */
          <>
            <div className="w-54 flex-shrink-0">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2.5">
                  <img src="/logo.png" alt="VedaAI" className="w-8 h-8 rounded-lg shadow-sm object-cover" />
                  <span className="font-bold text-xl tracking-tight text-zinc-900">VedaAI</span>
                </div>
                <div className="flex items-center space-x-1">
                  <button 
                    className="hidden lg:flex p-1.5 text-zinc-400 hover:text-zinc-800 rounded-lg hover:bg-zinc-100 transition-colors"
                    onClick={() => setIsCollapsed(true)}
                    title="Collapse Sidebar"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
                  </button>
                  <button className="lg:hidden p-1 text-zinc-500 hover:text-zinc-900" onClick={() => setIsMobileOpen(false)}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* AI Teacher's Toolkit with Orange Gradient Glow Border */}
              <div className="p-[1.5px] bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-full shadow-sm mb-6">
                <button 
                  onClick={() => toast("AI Teacher's Toolkit is already active!", { icon: "✨" })} 
                  className="w-full bg-zinc-900 text-white rounded-full py-2.5 flex items-center justify-center space-x-2 text-xs font-semibold hover:bg-zinc-800 transition-colors"
                >
                  <span>✦</span>
                  <span>AI Teacher's Toolkit</span>
                </button>
              </div>

              <nav className="space-y-1">
                <NavItem icon={<Home size={18} />} label="Home" onClick={() => setIsMobileOpen(false)} />
                <NavItem icon={<Users size={18} />} label="My Classroom" onClick={() => setIsMobileOpen(false)} />
                <NavItem icon={<FileText size={18} />} label="Assignments" onClick={() => setIsMobileOpen(false)} />
                <NavItem icon={<FileSpreadsheet size={18} />} label="Exams" active onClick={() => setIsMobileOpen(false)} />
                <NavItem icon={<Clock size={18} />} label="My Library" onClick={() => setIsMobileOpen(false)} />
              </nav>
            </div>

            <div className="w-54 flex-shrink-0">
              <nav className="space-y-1 mb-4">
                <NavItem icon={<Settings size={18} />} label="Settings" onClick={() => setIsMobileOpen(false)} />
              </nav>
              
              <div className="bg-zinc-100/80 p-3 rounded-2xl flex items-center space-x-3 border border-zinc-200/50 shadow-sm">
                <div className="bg-white p-2 rounded-xl text-green-700 flex-shrink-0 shadow-sm border border-zinc-100 flex items-center justify-center">
                  <span className="font-bold text-xs text-green-800">DPS</span>
                </div>
                <div className="text-xs overflow-hidden">
                  <p className="font-semibold text-zinc-800 truncate">Delhi Public School</p>
                  <p className="text-zinc-400 text-[11px] truncate">Bokaro Steel City</p>
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button 
      onClick={() => {
        if (!active) toast(`${label} view coming soon!`, { icon: "🚀" });
        if (onClick) onClick();
      }}
      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        active 
          ? "bg-zinc-100 text-zinc-900 font-medium" 
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MiniNavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button 
      onClick={() => {
        if (!active) toast(`${label} view coming soon!`, { icon: "🚀" });
        if (onClick) onClick();
      }}
      title={label}
      className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm transition-all ${
        active 
          ? "bg-zinc-100 text-zinc-900 font-medium shadow-sm" 
          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
      }`}
    >
      {icon}
    </button>
  );
}
