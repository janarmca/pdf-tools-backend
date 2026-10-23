import React from 'react';
import { ToolItem, ToolCategory, AppLanguage } from '../../types';
import { Sparkles, ArrowUpRight } from 'lucide-react';

interface ToolListProps {
  tools: ToolItem[];
  selectedCategory: ToolCategory;
  onSelectCategory: (cat: ToolCategory) => void;
  onSelectTool: (toolId: string) => void;
  lang: AppLanguage;
  searchQuery: string;
}

export const ToolList: React.FC<ToolListProps> = ({
  tools,
  selectedCategory,
  onSelectCategory,
  onSelectTool,
  lang,
  searchQuery,
}) => {
  const categoryChips: { id: ToolCategory; labelTa: string; labelEn: string; icon: string }[] = [
    { id: 'all', labelTa: 'அனைத்தும்', labelEn: 'All Tools', icon: '⚡' },
    { id: 'pdf', labelTa: 'PDF', labelEn: 'PDF', icon: '📄' },
    { id: 'business', labelTa: 'வணிகம் & பில்', labelEn: 'Business', icon: '💼' },
    { id: 'image', labelTa: 'படம் & போட்டோ', labelEn: 'Image', icon: '🖼️' },
    { id: 'education', labelTa: 'கல்வி & தமிழ்', labelEn: 'Education', icon: '📚' },
    { id: 'video', labelTa: 'வீடியோ & ஆடியோ', labelEn: 'Video/Audio', icon: '🎬' },
    { id: 'ai', labelTa: 'AI கருவிகள்', labelEn: 'AI Tools', icon: '🤖' },
  ];

  return (
    <div>
      {/* Category selector chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
        {categoryChips.map((chip) => {
          const isActive = selectedCategory === chip.id;
          return (
            <button
              key={chip.id}
              onClick={() => onSelectCategory(chip.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all shadow-2xs active:scale-95 ${
                isActive
                  ? 'bg-[#28407F] text-white shadow-sm'
                  : 'bg-white text-[#20242B] border border-[#E6E8EC] hover:border-[#B9C4E6] hover:bg-[#F8FAFF]'
              }`}
            >
              <span>{chip.icon}</span>
              <span>{lang === 'ta' ? chip.labelTa : chip.labelEn}</span>
            </button>
          );
        })}
      </div>

      {/* Header with tool count */}
      <div className="flex items-center justify-between mb-4">
        <div className="font-black text-lg text-[#20242B] flex items-center gap-2">
          <span>{lang === 'ta' ? 'கருவிகள் பட்டியல்' : 'Available Tools'}</span>
          <span className="text-xs bg-[#EEF1FA] text-[#3752A6] px-2.5 py-0.5 rounded-full font-bold">
            {tools.length}
          </span>
        </div>
        {searchQuery && (
          <span className="text-xs text-[#566070]">
            "{searchQuery}" — {tools.length} results
          </span>
        )}
      </div>

      {/* Tools Grid */}
      {tools.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E6E8EC] p-12 text-center my-6">
          <div className="text-4xl mb-3">🔍</div>
          <div className="font-extrabold text-base text-[#20242B] mb-1">
            {lang === 'ta' ? 'கருவி எதுவும் கிடைக்கவில்லை' : 'No tools matched your search'}
          </div>
          <div className="text-xs text-[#566070] mb-4">
            {lang === 'ta'
              ? 'வேறு வார்த்தைகளைக் கொண்டு தேடிப் பாருங்கள்.'
              : 'Try searching with different keywords like merge, pdf, gst, invoice, photo'}
          </div>
          <button
            onClick={() => onSelectCategory('all')}
            className="bg-[#3752A6] text-white text-xs font-bold px-4 py-2 rounded-xl"
          >
            {lang === 'ta' ? 'அனைத்து கருவிகளையும் காட்டு' : 'Reset Filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {tools.map((tool) => (
            <div
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className="bg-white border border-[#E6E8EC] rounded-2xl p-4 cursor-pointer hover:border-[#B8C4E6] hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 flex flex-col justify-between group text-left min-h-[160px]"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-2xs group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: `${tool.color}15`, color: tool.color }}
                  >
                    {tool.icon}
                  </div>
                  {tool.badge && (
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        tool.badge === 'Popular' || tool.badge === 'Top Tool'
                          ? 'bg-[#FFF3E0] text-[#9A6700]'
                          : 'bg-[#E3F6EB] text-[#176B45]'
                      }`}
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      {tool.badge}
                    </span>
                  )}
                </div>

                <div className="font-extrabold text-[15px] text-[#20242B] group-hover:text-[#3752A6] transition-colors leading-snug">
                  {lang === 'ta' ? tool.tamilName : tool.name}
                </div>
                <div className="text-[11px] font-semibold text-[#566070] mb-1">
                  {lang === 'ta' ? tool.name : tool.tamilName}
                </div>

                <div className="text-xs text-[#566070] line-clamp-2 leading-relaxed">
                  {lang === 'ta' ? tool.tamilDesc : tool.desc}
                </div>
              </div>

              <div className="pt-3 border-t border-[#F1F3F8] mt-3 flex items-center justify-between text-xs font-bold text-[#3752A6]">
                <span>{lang === 'ta' ? 'திறக்கவும்' : 'Open Tool'}</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
