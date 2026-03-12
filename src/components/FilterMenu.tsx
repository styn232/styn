import React from 'react';
import { Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface FilterMenuProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onAddClick?: () => void;
  className?: string;
}

export const FilterMenu: React.FC<FilterMenuProps> = ({
  tabs,
  activeTab,
  onTabChange,
  onAddClick,
  className,
}) => {
  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap border",
            activeTab === tab.id
              ? "bg-[#00FF00] text-black border-[#00FF00] shadow-[0_0_15px_rgba(0,255,0,0.3)]"
              : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:border-white/20"
          )}
        >
          <span>{tab.label}</span>
          {tab.count !== undefined && tab.count > 0 && (
            <span
              className={cn(
                "flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black",
                activeTab === tab.id ? "bg-black text-[#00FF00]" : "bg-[#00FF00] text-black"
              )}
            >
              {tab.count > 99 ? '99+' : tab.count}
            </span>
          )}
        </button>
      ))}
      
      {onAddClick && (
        <button
          onClick={onAddClick}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20 hover:text-white transition-all duration-300 shrink-0"
        >
          <Plus size={20} />
        </button>
      )}
    </div>
  );
};
