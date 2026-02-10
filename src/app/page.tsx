'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Mail, Settings, UserCircle, Sparkles, ArrowRight } from 'lucide-react';
import { ProjectShowcase } from '@/components/ProjectShowcase';
import { ServiceShowcase } from '@/components/ServiceShowcase';
import { Inbox } from '@/components/Inbox';
import { RoleSelectionPage } from '@/components/RoleSelection';
import { ProjectOnboarding } from '@/components/ProjectOnboarding';
import { ProfileOnboarding } from '@/components/ProfileOnboarding';
import { logout } from '@/lib/auth';

const GeometricDecorations = () => (
  <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
    <div className="absolute -top-[200px] -right-[200px] w-[800px] h-[800px] rounded-full border border-ink/10 opacity-60"></div>
    <div className="absolute -top-[150px] -right-[150px] w-[700px] h-[700px] rounded-full border border-dashed border-ink/20 opacity-40 animate-[spin_120s_linear_infinite]"></div>
    <div className="absolute top-[200px] right-[200px] w-12 h-12 bg-orange-300 rounded-full opacity-70 translate-x-1/2 -translate-y-1/2 shadow-lg shadow-orange-200/50"></div>
    <div className="absolute top-0 left-[10%] w-px h-full bg-ink/10 hidden md:block"></div>
    <div className="absolute top-0 right-[10%] w-px h-full bg-ink/10 hidden md:block"></div>
    <div className="absolute top-[30%] left-0 w-full h-px bg-ink/10"></div>
    <div className="absolute -bottom-[50px] -left-[50px] w-64 h-64 border border-ink/10 rotate-12 opacity-50"></div>
  </div>
);

const LandingPage = ({ onStartCreate, onViewProjects }: { onStartCreate: () => void, onViewProjects: () => void }) => {
  return (
    <div className="flex flex-col min-h-full overflow-y-auto custom-scrollbar bg-paper-texture relative">
      <GeometricDecorations />
      <section className="flex flex-col items-center justify-center min-h-[85vh] text-center px-4 relative z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-ink/10 bg-white/50 backdrop-blur-sm text-xs font-sans font-medium text-ink-light tracking-wide mb-4 shadow-sm">
            <Sparkles className="w-3 h-3 text-accent-red" />
            AI-Powered Co-founder Matching
          </div>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-ink leading-[1.1]">Connecting Visionaries <br /> <span className="italic font-light text-ink/80">with Builders</span></h1>
          <p className="text-lg md:text-xl font-sans text-ink-light max-w-2xl mx-auto leading-relaxed">Startup Hub is the premier network for high-potential founders in China. We use intelligent agents to articulate your vision and find the talent that fits your DNA.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <button onClick={onStartCreate} className="px-8 py-4 bg-ink text-white rounded-lg font-sans font-medium text-lg hover:bg-ink-light transition-all shadow-float flex items-center justify-center gap-2 group relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">Join the Network <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
            </button>
            <button onClick={onViewProjects} className="px-8 py-4 bg-white border border-border text-ink rounded-lg font-sans font-medium text-lg hover:bg-gray-50 transition-all shadow-sm">
              Browse Projects
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default function Home() {
  const [currentView, setCurrentView] = useState<'landing' | 'role_selection' | 'project_create' | 'profile_create' | 'project_showcase' | 'service_showcase' | 'inbox'>('landing');

  useEffect(() => {
    // Basic dynamic view selection via URL hash or param
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view && ['landing', 'role_selection', 'project_create', 'profile_create', 'project_showcase', 'service_showcase', 'inbox'].includes(view)) {
      setCurrentView(view as any);
    }
  }, []);

  // 处理注销
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      // 可以在这里重新加载页面或清除状态
      window.location.reload();
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-paper-texture text-ink selection:bg-accent-red/20 overflow-hidden">
      <nav className="h-16 border-b border-border bg-paper/90 backdrop-blur z-50 flex-none flex items-center justify-between px-6 transition-all">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('landing')}>
          <div className="w-8 h-8 bg-ink text-white flex items-center justify-center font-serif font-bold text-xl rounded-sm">H</div>
          <span className="font-serif font-bold text-lg tracking-wide">Startup Hub <span className="text-[10px] bg-ink/10 px-1 rounded ml-1 text-ink-light align-top">v0.5</span></span>
        </div>

        {currentView === 'landing' ? (
          <div className="hidden md:flex items-center gap-8 text-sm font-sans font-medium text-ink-light">
            <button onClick={() => setCurrentView('project_showcase')} className="hover:text-ink transition-colors">Projects</button>
            <button onClick={() => setCurrentView('service_showcase')} className="hover:text-ink transition-colors">Services</button>
            <button onClick={() => setCurrentView('inbox')} className="hover:text-ink transition-colors flex items-center gap-2"><Mail className="w-4 h-4" /> Inbox</button>
            <Link href="/dashboard" className="hover:text-ink transition-colors flex items-center gap-2"><UserCircle className="w-4 h-4" /> Me</Link>
            <button onClick={handleLogout} className="hover:text-ink transition-colors"><Settings className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="text-xs font-sans text-ink-light flex items-center gap-2">
            <span className="hidden md:inline">{currentView === 'role_selection' ? 'Select Role' : 'Drafting Mode'}</span>
            {currentView !== 'role_selection' && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
          </div>
        )}
      </nav>

      <main className="flex-1 overflow-hidden relative">
        {currentView === 'landing' && <LandingPage onStartCreate={() => setCurrentView('role_selection')} onViewProjects={() => setCurrentView('project_showcase')} />}
        {currentView === 'role_selection' && <RoleSelectionPage onNavigate={setCurrentView} />}
        {currentView === 'project_create' && <ProjectOnboarding onBack={() => setCurrentView('role_selection')} />}
        {currentView === 'profile_create' && <ProfileOnboarding onBack={() => setCurrentView('role_selection')} />}
        {currentView === 'project_showcase' && <ProjectShowcase onBack={() => setCurrentView('landing')} />}
        {currentView === 'service_showcase' && <ServiceShowcase onBack={() => setCurrentView('landing')} />}
        {currentView === 'inbox' && <Inbox onBack={() => setCurrentView('landing')} />}
      </main>
    </div>
  );
}
