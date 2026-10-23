import React, { useState, useEffect, useMemo } from 'react';
import { TOOLS } from './data/tools';
import { ToolCategory, AppLanguage, ToolItem } from './types';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Hero } from './components/home/Hero';
import { CategoryGrid } from './components/home/CategoryGrid';
import { AudienceHubs } from './components/home/AudienceHubs';
import { ToolList } from './components/home/ToolList';
import { ToolWorkspace } from './components/tools/ToolWorkspace';
import { GovtEmployeesHub } from './components/tools/hubs/GovtEmployeesHub';
import { StudentsHub } from './components/tools/hubs/StudentsHub';
import { MatrimonyModal } from './components/tools/hubs/MatrimonyModal';

export const App: React.FC = () => {
  // Language State - Tamil by default as per original site
  const [lang, setLang] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem('pti_lang');
      return saved === 'en' ? 'en' : 'ta';
    } catch {
      return 'ta';
    }
  });

  const handleLanguageChange = (newLang: AppLanguage) => {
    setLang(newLang);
    try {
      localStorage.setItem('pti_lang', newLang);
    } catch {}
  };

  // View state: 'home' | 'tool' | 'govt' | 'students' | 'matrimony'
  const [currentView, setCurrentView] = useState<'home' | 'tool' | 'govt' | 'students' | 'matrimony'>('home');
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handle URL deep links on load (e.g. ?tool=merge)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toolParam = params.get('tool');
    if (toolParam && TOOLS.some((t) => t.id === toolParam)) {
      setActiveToolId(toolParam);
      setCurrentView('tool');
    }
  }, []);

  const openTool = (id: string) => {
    const found = TOOLS.find((t) => t.id === id);
    if (found) {
      setActiveToolId(id);
      setCurrentView('tool');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleOpenHub = (hub: 'govt' | 'students' | 'farmer' | 'kalvi' | 'matrimony') => {
    if (hub === 'farmer') {
      openTool('uzhavartools');
    } else if (hub === 'kalvi') {
      openTool('kalvikalanjiyam');
    } else if (hub === 'govt') {
      setCurrentView('govt');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (hub === 'students') {
      setCurrentView('students');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (hub === 'matrimony') {
      setCurrentView('matrimony');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNavigateHome = () => {
    setCurrentView('home');
    setActiveToolId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter tools based on category and search query
  const filteredTools = useMemo(() => {
    let result = TOOLS;

    if (selectedCategory !== 'all') {
      result = result.filter((t) => t.cat === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.tamilName.toLowerCase().includes(q) ||
          t.desc.toLowerCase().includes(q) ||
          t.tamilDesc.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.keywords && t.keywords.some((k) => k.toLowerCase().includes(q)))
      );
    }

    return result;
  }, [selectedCategory, searchQuery]);

  const activeTool = useMemo(
    () => TOOLS.find((t) => t.id === activeToolId) || null,
    [activeToolId]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F7FB] text-[#20242B]">
      {/* Top Navbar */}
      <Navbar
        lang={lang}
        onLanguageChange={handleLanguageChange}
        onNavigateHome={handleNavigateHome}
        onOpenHub={handleOpenHub}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {currentView === 'home' && (
          <>
            <Hero
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onQuickSelect={openTool}
              lang={lang}
            />

            {!searchQuery && (
              <>
                <CategoryGrid
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  lang={lang}
                />

                <AudienceHubs lang={lang} onOpenHub={handleOpenHub} />
              </>
            )}

            <ToolList
              tools={filteredTools}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onSelectTool={openTool}
              lang={lang}
              searchQuery={searchQuery}
            />
          </>
        )}

        {currentView === 'tool' && activeTool && (
          <ToolWorkspace
            tool={activeTool}
            lang={lang}
            onBack={handleNavigateHome}
          />
        )}

        {currentView === 'govt' && (
          <GovtEmployeesHub
            lang={lang}
            onSelectTool={openTool}
            onBack={handleNavigateHome}
          />
        )}

        {currentView === 'students' && (
          <StudentsHub
            lang={lang}
            onSelectTool={openTool}
            onBack={handleNavigateHome}
          />
        )}

        {currentView === 'matrimony' && (
          <MatrimonyModal
            lang={lang}
            onOpenBiodata={() => openTool('biodata')}
            onBack={handleNavigateHome}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        lang={lang}
        onOpenHub={handleOpenHub}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          handleNavigateHome();
        }}
      />
    </div>
  );
};
export default App;
