import { useEffect, useState, useRef } from 'react';
import { ContractStyleConfig } from '@/types/contract-generator';

interface ContractPagedPreviewProps {
  content: string;
  styleConfig: ContractStyleConfig;
}

export function ContractPagedPreview({ content, styleConfig }: ContractPagedPreviewProps) {
  const [pages, setPages] = useState<string[]>([content]);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // For now, we'll use a simple approach: render content and let CSS handle page breaks
    // In the future, we can implement more sophisticated pagination logic
    setPages([content]);
  }, [content]);

  const renderPage = (pageContent: string, pageIndex: number) => (
    <div key={pageIndex} className="contract-page">
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
    <>
      {pages.map((pageContent, index) => renderPage(pageContent, index))}
      <div ref={measureRef} style={{ display: 'none' }} />
    </>
  );
}
