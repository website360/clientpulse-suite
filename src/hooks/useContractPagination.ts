import { useEffect, useState, useRef } from 'react';

interface PaginationOptions {
  content: string;
  pageHeight: number; // in pixels
  headerHeight: number;
  footerHeight: number;
  padding: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export function useContractPagination(options: PaginationOptions) {
  const [pages, setPages] = useState<string[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!options.content) {
      setPages([]);
      return;
    }

    // Create a temporary container to measure content
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.width = '210mm'; // A4 width
    tempContainer.style.padding = `${options.padding.top}px ${options.padding.right}px ${options.padding.bottom}px ${options.padding.left}px`;
    tempContainer.innerHTML = options.content;
    document.body.appendChild(tempContainer);

    const availableHeight = options.pageHeight - options.headerHeight - options.footerHeight - options.padding.top - options.padding.bottom;
    
    // Split content into pages based on height
    const newPages: string[] = [];
    const elements = Array.from(tempContainer.children) as HTMLElement[];
    let currentPageContent: HTMLElement[] = [];
    let currentHeight = 0;

    elements.forEach((element) => {
      const elementHeight = element.offsetHeight;
      
      if (currentHeight + elementHeight > availableHeight && currentPageContent.length > 0) {
        // Start a new page
        newPages.push(currentPageContent.map(el => el.outerHTML).join(''));
        currentPageContent = [element];
        currentHeight = elementHeight;
      } else {
        currentPageContent.push(element);
        currentHeight += elementHeight;
      }
    });

    // Add the last page
    if (currentPageContent.length > 0) {
      newPages.push(currentPageContent.map(el => el.outerHTML).join(''));
    }

    // Cleanup
    document.body.removeChild(tempContainer);

    setPages(newPages.length > 0 ? newPages : [options.content]);
  }, [options.content, options.pageHeight, options.headerHeight, options.footerHeight, options.padding]);

  return { pages, contentRef };
}
