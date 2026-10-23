import React from 'react';
import { CATEGORIES } from '../../data/tools';
import { AppLanguage, ToolCategory } from '../../types';

interface CategoryGridProps {
  selectedCategory: ToolCategory;
  onSelectCategory: (cat: ToolCategory) => void;
  lang: AppLanguage;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  selectedCategory,
  onSelectCategory,
  lang,
}) => {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-[#20242B]">
          {lang === 'ta' ? 'முக்கியப் பிரிவுகள்' : 'Explore Categories'}
        </h2>
        {selectedCategory !== 'all' && (
          <button
            onClick={() => onSelectCategory('all')}
            className="text-xs font-bold text-[#3752A6] hover:underline"
          >
            {lang === 'ta' ? 'அனைத்தும் காட்டுக (All Tools)' : 'Show All Tools'}
          </button>
        )}
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(isSelected ? 'all' : cat.id)}
              className={`relative overflow-hidden rounded-2xl p-5 text-left cursor-pointer transition-all duration-150 border flex flex-col justify-between min-h-[140px] shadow-sm group hover:-translate-y-1 hover:shadow-md ${
                isSelected
                  ? 'border-[#3752A6] ring-2 ring-[#3752A6]/30 bg-white'
                  : 'border-[#E6E8EC] bg-white hover:border-[#CBD6F2]'
              }`}
            >
              {/* Category Icon and Counter Badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl p-2 rounded-xl bg-[#F6F7FB] border border-[#E6E8EC] group-hover:scale-110 transition-transform">
                  {cat.icon}
                </span>
                <span
                  className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full ${
                    isSelected
                      ? 'bg-[#3752A6] text-white'
                      : 'bg-[#EEF1FA] text-[#3752A6]'
                  }`}
                >
                  {cat.count}+ {lang === 'ta' ? 'கருவிகள்' : 'Tools'}
                </span>
              </div>

              {/* Title & Desc */}
              <div>
                <div className="font-black text-base text-[#20242B] group-hover:text-[#3752A6] transition-colors">
                  {lang === 'ta' ? cat.tamilName : cat.name}
                </div>
                <div className="text-xs text-[#566070] line-clamp-2 mt-1">
                  {lang === 'ta' ? cat.tamilDesc : cat.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
