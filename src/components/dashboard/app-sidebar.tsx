"use client";

import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Activity,
  Target,
  Upload,
  Settings,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

type ViewType = "kpi" | "trend" | "analisis" | "target";

interface AppSidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  showUpload: boolean;
  setShowUpload: (show: boolean) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const kpiSubItems: { key: ViewType; label: string; icon: typeof BarChart3 }[] = [
  { key: "kpi", label: "KPI", icon: BarChart3 },
  { key: "trend", label: "Tren", icon: TrendingUp },
  { key: "analisis", label: "Analisis", icon: Activity },
  { key: "target", label: "Target", icon: Target },
];

export function AppSidebar({
  activeView,
  setActiveView,
  showUpload,
  setShowUpload,
  onOpenSettings,
  onLogout,
  isSidebarOpen,
  setIsSidebarOpen,
  collapsed = false,
  onToggleCollapse,
}: AppSidebarProps) {
  const [kpiExpanded, setKpiExpanded] = useState(true);

  const isKpiGroupActive = ["kpi", "trend", "analisis", "target"].includes(activeView);

  const handleNavClick = (view: ViewType) => {
    setActiveView(view);
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleUploadClick = () => {
    setShowUpload(true);
    setActiveView("kpi");
    setKpiExpanded(true);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleSettingsClick = () => {
    onOpenSettings();
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleBackdropClick = () => {
    setIsSidebarOpen(false);
  };

  return (
    <>
      {/* ── Mobile/Tablet Backdrop ── */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden sidebar-backdrop-enter"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed top-0 left-0 z-[70] h-screen flex flex-col
          bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800
          border-r border-white/[0.06]
          shadow-[4px_0_24px_rgba(0,0,0,0.2)]
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-16" : "w-60"}
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          sidebar-enter
        `}
      >
        {/* ── Logo Area ── */}
        <div className="flex items-center h-14 px-4 shrink-0 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Activity className="h-4.5 w-4.5 text-emerald-400" />
            </div>
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
              }`}
            >
              <h1 className="text-sm font-black tracking-tight text-white whitespace-nowrap">
                ZOLDYCK
              </h1>
            </div>
          </div>
        </div>

        {/* ── Nav Items ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2.5 space-y-1 sidebar-scroll">
          {/* KPI Group */}
          <div>
            <button
              onClick={() => setKpiExpanded(!kpiExpanded)}
              className={`
                w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                text-[10px] font-bold uppercase tracking-widest
                transition-colors duration-150
                ${isKpiGroupActive ? "text-emerald-400" : "text-slate-500 hover:text-slate-300"}
              `}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span
                className={`flex-1 text-left whitespace-nowrap transition-all duration-300 ${
                  collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                }`}
              >
                KPI
              </span>
              {!collapsed && (
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-200 ${
                    kpiExpanded ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>

            {/* Sub-items */}
            <div
              className={`mt-0.5 ml-1 space-y-0.5 overflow-hidden transition-all duration-300 ease-in-out ${
                kpiExpanded ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
              } ${collapsed ? "ml-0" : "ml-1"}`}
            >
              {kpiSubItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavClick(item.key)}
                    title={collapsed ? item.label : undefined}
                    className={`
                      w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                      text-[13px] font-medium
                      transition-all duration-150 relative
                      ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-400 shadow-[inset_3px_0_0_0_rgba(16,185,129,0.6)]"
                          : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                      }
                      ${collapsed ? "justify-center px-0" : ""}
                    `}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span
                      className={`whitespace-nowrap transition-all duration-300 ${
                        collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                      }`}
                    >
                      {item.label}
                    </span>
                    {isActive && (
                      <span
                        className={`absolute right-2.5 w-1.5 h-1.5 rounded-full bg-emerald-400 transition-opacity duration-300 ${
                          collapsed ? "opacity-0" : "opacity-100"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="!my-3 border-t border-white/[0.06]" />

          {/* Upload */}
          <button
            onClick={handleUploadClick}
            title={collapsed ? "Upload" : undefined}
            className={`
              w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg
              text-[13px] font-medium transition-all duration-150
              ${
                showUpload
                  ? "bg-emerald-500/15 text-emerald-400 shadow-[inset_3px_0_0_0_rgba(16,185,129,0.6)]"
                  : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
              }
              ${collapsed ? "justify-center px-0" : ""}
            `}
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span
              className={`whitespace-nowrap transition-all duration-300 ${
                collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
              }`}
            >
              Upload Data
            </span>
          </button>
        </nav>

        {/* ── Bottom Section ── */}
        <div className="shrink-0 border-t border-white/[0.06] px-2.5 py-3 space-y-0.5">
          {/* Settings */}
          <button
            onClick={handleSettingsClick}
            title={collapsed ? "Pengaturan" : undefined}
            className={`
              w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg
              text-[13px] font-medium
              text-slate-400 hover:bg-white/[0.05] hover:text-slate-200
              transition-all duration-150
              ${collapsed ? "justify-center px-0" : ""}
            `}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span
              className={`whitespace-nowrap transition-all duration-300 ${
                collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
              }`}
            >
              Pengaturan
            </span>
          </button>

          {/* Logout */}
          <button
            onClick={onLogout}
            title={collapsed ? "Logout" : undefined}
            className={`
              w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg
              text-[13px] font-medium
              text-slate-400 hover:bg-red-500/10 hover:text-red-400
              transition-all duration-150
              ${collapsed ? "justify-center px-0" : ""}
            `}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span
              className={`whitespace-nowrap transition-all duration-300 ${
                collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
              }`}
            >
              Logout
            </span>
          </button>
        </div>

        {/* ── Collapse Toggle (md only) ── */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={`
              absolute -right-3 top-16 w-6 h-6 rounded-full
              bg-slate-800 border border-white/10
              flex items-center justify-center
              text-slate-400 hover:text-white hover:bg-slate-700
              transition-colors shadow-lg hidden md:flex
            `}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </button>
        )}

        {/* ── Mobile Close Button ── */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="absolute top-3 right-3 w-7 h-7 rounded-lg md:hidden
            flex items-center justify-center
            text-slate-400 hover:text-white hover:bg-white/10
            transition-colors"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </aside>
    </>
  );
}