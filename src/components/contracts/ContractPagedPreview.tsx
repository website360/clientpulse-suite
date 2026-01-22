import { useEffect, useState, useRef } from 'react';
import { ContractStyleConfig } from '@/types/contract-generator';

interface ContractPagedPreviewProps {
  content: string;
  styleConfig: ContractStyleConfig;
}

export function ContractPagedPreview({ content, styleConfig }: ContractPagedPreviewProps) {
  const [pages, setPages] = useState<string[]>([]);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!content) {
      setPages([]);
      return;
    }

    // Calculate available height for content
    const pageHeightMm = 297;
    const pageHeightPx = (pageHeightMm * 96) / 25.4; // Convert mm to px (96 DPI)
    const headerHeight = styleConfig.headerLogo ? styleConfig.headerLogoHeight + 80 : 0;
    const availableHeight = pageHeightPx - styleConfig.marginTop - styleConfig.marginBottom - headerHeight - 40; // 40px extra margin

    // Create temporary container to measure content
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.visibility = 'hidden';
    tempContainer.style.width = '210mm';
    tempContainer.style.padding = `0 ${styleConfig.marginRight}px 0 ${styleConfig.marginLeft}px`;
    tempContainer.style.fontFamily = `'${styleConfig.fontFamily}', serif`;
    tempContainer.style.fontSize = `${styleConfig.fontSize}pt`;
    tempContainer.style.lineHeight = `${styleConfig.lineHeight}`;
    tempContainer.style.fontWeight = styleConfig.paragraphBold ? 'bold' : 'normal';
    tempContainer.className = 'contract-content';
    tempContainer.innerHTML = content;
    document.body.appendChild(tempContainer);

    // Split content into pages
    const newPages: string[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const elements = Array.from(doc.body.children);

    let currentPageElements: Element[] = [];
    let currentHeight = 0;

    elements.forEach((element) => {
      // Create a temporary element to measure
      const tempEl = element.cloneNode(true) as HTMLElement;
      tempContainer.innerHTML = '';
      tempContainer.appendChild(tempEl);
      const elementHeight = tempEl.offsetHeight;

      // Check if adding this element would exceed page height
      if (currentHeight + elementHeight > availableHeight && currentPageElements.length > 0) {
        // Save current page
        const pageDiv = document.createElement('div');
        currentPageElements.forEach(el => pageDiv.appendChild(el.cloneNode(true)));
        newPages.push(pageDiv.innerHTML);
        
        // Start new page
        currentPageElements = [element];
        currentHeight = elementHeight;
      } else {
        currentPageElements.push(element);
        currentHeight += elementHeight;
      }
    });

    // Add last page
    if (currentPageElements.length > 0) {
      const pageDiv = document.createElement('div');
      currentPageElements.forEach(el => pageDiv.appendChild(el.cloneNode(true)));
      newPages.push(pageDiv.innerHTML);
    }

    // Cleanup
    document.body.removeChild(tempContainer);

    // If no pages were created, add the full content as one page
    setPages(newPages.length > 0 ? newPages : [content]);
  }, [content, styleConfig]);

  const renderPage = (pageContent: string, pageIndex: number) => (
    <div key={pageIndex} className="contract-page" style={{ height: '297mm' }}>
      {/* Background Image */}
      {styleConfig.backgroundImage && (
        <>
          <div 
            className="contract-page-background"
            style={{ backgroundImage: `url(${styleConfig.backgroundImage})` }}
          />
          <div 
            className="contract-page-overlay"
            style={{ backgroundColor: `rgba(255,255,255,${1 - styleConfig.backgroundOpacity})` }}
          />
        </>
      )}
      
      {/* Content */}
      <div 
        className="contract-page-content"
        style={{
          padding: `${styleConfig.marginTop}px ${styleConfig.marginRight}px ${styleConfig.marginBottom}px ${styleConfig.marginLeft}px`,
        }}
      >
        {/* Header Logo - only on first page */}
        {pageIndex === 0 && styleConfig.headerLogo && (
          <div className="mb-6">
            <div className="flex justify-start mb-3">
              <img 
                src={styleConfig.headerLogo} 
                alt="Logo" 
                style={{ height: `${styleConfig.headerLogoHeight}px` }}
                className="object-contain"
              />
            </div>
            {styleConfig.showHeaderLine && (
              <div 
                className="w-full border-t-2"
                style={{ 
                  borderColor: '#FFD700',
                  marginBottom: '20px'
                }}
              />
            )}
          </div>
        )}
        
        <div 
          className="contract-content"
          style={{
            fontFamily: `'${styleConfig.fontFamily}', serif`,
            fontSize: `${styleConfig.fontSize}pt`,
            lineHeight: styleConfig.lineHeight,
            fontWeight: styleConfig.paragraphBold ? 'bold' : 'normal',
          }}
          dangerouslySetInnerHTML={{ __html: pageContent }}
        />
      </div>
    </div>
  );

  return (
    <div className="contract-pages-container">
      {pages.map((pageContent, index) => renderPage(pageContent, index))}
      <div ref={measureRef} style={{ display: 'none' }} />
    </div>
  );
}
