"use client";

import { Home, Users, FileText, FileSpreadsheet, Clock, Settings, LayoutTemplate } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white h-screen flex flex-col justify-between border-r p-4 sticky top-0">
      <div>
        <div className="flex items-center space-x-2 mb-8">
          <div className="bg-zinc-900 text-white p-1 rounded">
            <LayoutTemplate size={20} />
          </div>
          <span className="font-bold text-xl">VedaAI</span>
        </div>

        <button onClick={() => toast("AI Teacher's Toolkit is already active!", { icon: "✨" })} className="w-full bg-zinc-800 text-white rounded-full py-2 flex items-center justify-center space-x-2 mb-8 text-sm hover:bg-zinc-700 transition-colors">
          <span>✨</span>
          <span>AI Teacher's Toolkit</span>
        </button>

        <nav className="space-y-1">
          <NavItem icon={<Home size={18} />} label="Home" />
          <NavItem icon={<Users size={18} />} label="My Classroom" />
          <NavItem icon={<FileText size={18} />} label="Assignments" />
          <NavItem icon={<FileSpreadsheet size={18} />} label="Exams" active />
          <NavItem icon={<Clock size={18} />} label="My Library" />
        </nav>
      </div>

      <div>
        <nav className="space-y-1 mb-4">
          <NavItem icon={<Settings size={18} />} label="Settings" />
        </nav>
        
        <div className="bg-zinc-50 p-3 rounded-xl flex items-center space-x-3">
          <div className="bg-green-100 p-2 rounded-lg text-green-700">
            <Users size={16} />
          </div>
          <div className="text-sm">
            <p className="font-medium">Delhi Public School</p>
            <p className="text-zinc-500 text-xs">Bokaro Steel City</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button 
      onClick={() => {
        if (!active) toast(`${label} view coming soon!`, { icon: "🚀" });
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
