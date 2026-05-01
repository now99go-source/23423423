import React, { useState, useRef, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, ScanSearch, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FILE_TYPES = [
  { value: 'pdf', label: 'PDF' },
  { value: 'word', label: 'Word' },
  { value: 'image', label: 'صورة' },
  { value: 'link', label: 'رابط' },
];

export default function SearchBar({
  query,
  onQueryChange,
  onOCRSearch,
  isOCRSearching,
  selectedTypes,
  onTypesChange,
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const activeFilters = selectedTypes.length;

  return (
    <div className="space-y-3">
      {/* Main Search Input */}
      <div className={`relative flex items-center gap-2 bg-card border-2 rounded-xl px-3 transition-all duration-200 ${
        focused ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'
      }`}>
        <Search className="w-5 h-5 text-muted-foreground shrink-0" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="ابحث بالجدارة، اسم الشاهد، اسم الملف، الملاحظات..."
          className="border-0 shadow-none bg-transparent focus-visible:ring-0 text-sm h-11"
          dir="rtl"
        />
        {query && (
          <button onClick={() => onQueryChange('')} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Type Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
              نوع الملف
              {activeFilters > 0 && (
                <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary">
                  {activeFilters}
                </Badge>
              )}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" dir="rtl">
            <DropdownMenuLabel>تصفية حسب النوع</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {FILE_TYPES.map((type) => (
              <DropdownMenuCheckboxItem
                key={type.value}
                checked={selectedTypes.includes(type.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onTypesChange([...selectedTypes, type.value]);
                  } else {
                    onTypesChange(selectedTypes.filter((t) => t !== type.value));
                  }
                }}
              >
                {type.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* OCR Search Button */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
          onClick={() => onOCRSearch(query)}
          disabled={isOCRSearching || !query.trim()}
        >
          <ScanSearch className="w-3.5 h-3.5" />
          {isOCRSearching ? 'جارٍ البحث...' : 'بحث OCR داخل الملفات'}
        </Button>

        {/* Active type badges */}
        {selectedTypes.map((type) => (
          <Badge
            key={type}
            variant="secondary"
            className="text-xs gap-1 cursor-pointer"
            onClick={() => onTypesChange(selectedTypes.filter((t) => t !== type))}
          >
            {FILE_TYPES.find((t) => t.value === type)?.label}
            <X className="w-3 h-3" />
          </Badge>
        ))}

        {(activeFilters > 0 || query) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => { onQueryChange(''); onTypesChange([]); }}
          >
            مسح الكل
          </Button>
        )}
      </div>
    </div>
  );
}