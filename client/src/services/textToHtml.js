class TextToHtmlService {
  
  /**
   * Convert plain text to HTML with enhanced medical report formatting
   */
  static convertToHtml(text, options = {}) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    const {
      formatHeaders = true,
      formatLists = true,
      formatMedicalTerms = true,
      createParagraphs = true,
      addPageBreaks = false,
      fontFamily = 'Arial',
      fontSize = '11pt',
      lineHeight = '1.5'
    } = options;

    let html = text.trim();

    // 1. Escape HTML to prevent conflicts
    html = this.escapeHtml(html);

    // 2. Format medical sections and headers
    if (formatHeaders) {
      html = this.formatMedicalSections(html);
    }

    // 3. Format lists (numbered and bulleted)
    if (formatLists) {
      html = this.formatLists(html);
    }

    // 4. Format medical terms and measurements
    if (formatMedicalTerms) {
      html = this.formatMedicalTerms(html);
    }

    // 5. Create paragraphs from line breaks
    if (createParagraphs) {
      html = this.createParagraphs(html);
    } else {
      html = html.replace(/\n/g, '<br>');
    }

    // 6. Add page breaks if needed
    if (addPageBreaks) {
      html = this.addPageBreaks(html);
    }

    // 7. Wrap in medical report container
    return this.wrapInMedicalContainer(html, { fontFamily, fontSize, lineHeight });
  }

  /**
   * Enhanced medical section formatting
   */
  static formatMedicalSections(text) {
    // Primary medical sections
    const primarySections = [
      /^(CLINICAL HISTORY|HISTORY|INDICATION):?\s*(.*)$/gmi,
      /^(FINDINGS|OBSERVATION|OBSERVATIONS):?\s*(.*)$/gmi,
      /^(IMPRESSION|CONCLUSION|DIAGNOSIS):?\s*(.*)$/gmi,
      /^(RECOMMENDATIONS?|ADVICE):?\s*(.*)$/gmi
    ];

    primarySections.forEach(pattern => {
      text = text.replace(pattern, (match, header, content) => {
        const headerStyle = `
          color: #064e3b; 
          font-weight: bold; 
          text-decoration: underline; 
          margin: 15px 0 8px 0; 
          font-size: 12pt;
          background-color: #f0fdf4;
          padding: 6px 0;
          border-left: 4px solid #22c55e;
          padding-left: 8px;
        `;
        return `<h3 style="${headerStyle}">${header.toUpperCase()}:</h3>${content ? `<p>${content}</p>` : ''}`;
      });
    });

    // Secondary sections
    const secondarySections = [
      /^(TECHNIQUE|PROCEDURE|METHOD|COMPARISON|PRIOR STUDIES?):?\s*(.*)$/gmi
    ];

    secondarySections.forEach(pattern => {
      text = text.replace(pattern, (match, header, content) => {
        const headerStyle = `
          color: #166534; 
          font-weight: 600; 
          margin: 12px 0 6px 0; 
          font-size: 11pt;
        `;
        return `<h4 style="${headerStyle}">${header.toUpperCase()}:</h4>${content ? `<p>${content}</p>` : ''}`;
      });
    });

    return text;
  }

  /**
   * Enhanced list formatting with proper medical styling
   */
  static formatLists(text) {
    // Numbered lists with medical styling
    text = text.replace(/^(\d+[\.)]\s+.+)$/gm, (match, item) => {
      const cleanItem = item.replace(/^\d+[\.)]\s*/, '');
      return `<li style="margin: 4px 0; line-height: 1.4;">${cleanItem}</li>`;
    });

    // Wrap consecutive numbered list items
    text = text.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, (match) => {
      return `<ol style="margin: 8px 0; padding-left: 24px; color: #374151;">${match}</ol>`;
    });

    // Bulleted lists
    text = text.replace(/^([-•*]\s+.+)$/gm, (match, item) => {
      const cleanItem = item.replace(/^[-•*]\s*/, '');
      return `<li style="margin: 4px 0; line-height: 1.4;">${cleanItem}</li>`;
    });

    // Wrap consecutive bulleted list items
    text = text.replace(/(<li[^>]*>.*?<\/li>\s*(?:<ol[^>]*>.*?<\/ol>\s*)?)+/gs, (match) => {
      if (match.includes('<ol')) return match; // Skip if already wrapped in ol
      return `<ul style="margin: 8px 0; padding-left: 24px; color: #374151;">${match}</ul>`;
    });

    return text;
  }

  /**
   * Enhanced medical terms formatting
   */
  static formatMedicalTerms(text) {
    // Key medical findings (highlighted)
    const keyFindings = [
      /\b(NORMAL|ABNORMAL|NEGATIVE|POSITIVE|WNL|WITHIN\s+NORMAL\s+LIMITS?)\b/gi,
      /\b(NO\s+(?:EVIDENCE|SIGNS?|ACUTE|ACTIVE|SIGNIFICANT|ABNORMALITIES?))\b/gi,
      /\b(UNREMARKABLE|REMARKABLE)\b/gi,
      /\b(MILD|MODERATE|SEVERE|MARKED|EXTENSIVE)\b/gi
    ];

    keyFindings.forEach(pattern => {
      text = text.replace(pattern, '<strong style="color: #064e3b; background-color: #dcfce7; padding: 1px 3px; border-radius: 2px;">$1</strong>');
    });

    // Measurements and values (green highlight)
    text = text.replace(/(\d+(?:\.\d+)?\s*(?:mm|cm|ml|mg|kg|g|%|degrees?|x|cm2|ml\/min))/gi, 
      '<span style="font-weight: 600; color: #059669; background-color: #ecfdf5; padding: 1px 2px; border-radius: 2px;">$1</span>');

    // Medical terminology (subtle emphasis)
    const medicalTerms = [
      /\b(radiograph|CT|MRI|ultrasound|echocardiogram|electrocardiogram|X-ray)\b/gi,
      /\b(anterior|posterior|lateral|medial|superior|inferior|proximal|distal)\b/gi,
      /\b(bilateral|unilateral|symmetrical|asymmetrical)\b/gi
    ];

    medicalTerms.forEach(pattern => {
      text = text.replace(pattern, '<em style="color: #166534; font-style: normal; font-weight: 500;">$1</em>');
    });

    return text;
  }

  /**
   * Enhanced paragraph creation with medical formatting
   */
  static createParagraphs(text) {
    const paragraphs = text.split(/\n\s*\n/);
    
    return paragraphs.map(paragraph => {
      const trimmed = paragraph.trim();
      if (!trimmed) return '';
      
      // Don't wrap if already has HTML tags
      if (/<\/?(h[1-6]|ul|ol|li|div|p)\b/i.test(trimmed)) {
        return trimmed;
      }
      
      // Special handling for short lines (likely labels or headers)
      const lines = trimmed.split('\n');
      if (lines.length === 1 && lines[0].length < 50 && lines[0].toUpperCase() === lines[0]) {
        return `<h4 style="color: #166534; font-weight: 600; margin: 12px 0 6px 0; font-size: 11pt;">${trimmed}</h4>`;
      }
      
      // Regular paragraph
      const cleaned = trimmed.replace(/\n/g, ' ').replace(/\s+/g, ' ');
      return `<p style="margin: 6px 0; line-height: 1.5; color: #374151;">${cleaned}</p>`;
    }).filter(p => p).join('\n');
  }

  /**
   * Wrap in medical report container
   */
  static wrapInMedicalContainer(html, { fontFamily, fontSize, lineHeight }) {
    return `
      <div style="
        font-family: ${fontFamily}, sans-serif;
        font-size: ${fontSize};
        line-height: ${lineHeight};
        color: #374151;
        margin: 0;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(34, 197, 94, 0.1);
        max-width: 21cm;
        margin: 0 auto;
      ">
        ${html}
      </div>
    `;
  }

  /**
   * Convert HTML back to plain text (improved)
   */
  static htmlToText(html) {
    if (!html) return '';
    
    // Create a temporary element
    const div = document.createElement('div');
    div.innerHTML = html;
    
    // Replace headers with their text followed by colons and line breaks
    const headers = div.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headers.forEach(header => {
      const text = header.textContent.trim();
      header.outerHTML = `\n\n${text}\n`;
    });

    // Replace paragraphs with line breaks
    const paragraphs = div.querySelectorAll('p');
    paragraphs.forEach(p => {
      p.outerHTML = p.textContent.trim() + '\n\n';
    });

    // Replace lists
    const lists = div.querySelectorAll('ol, ul');
    lists.forEach(list => {
      const items = list.querySelectorAll('li');
      const isOrdered = list.tagName === 'OL';
      let listText = '\n';
      items.forEach((item, index) => {
        const prefix = isOrdered ? `${index + 1}. ` : '• ';
        listText += `${prefix}${item.textContent.trim()}\n`;
      });
      list.outerHTML = listText + '\n';
    });

    // Get final text content
    return div.textContent || div.innerText || '';
  }

  // ✅ ADD: Escape HTML characters to avoid injection and allow safe processing
  static escapeHtml(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, (m) => {
      switch (m) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#039;';
        default: return m;
      }
    });
  }

  // ✅ ADD: Simple page-break inserter before major sections
  static addPageBreaks(text) {
    if (!text || typeof text !== 'string') return text;
    // Insert page-break before major section headers (IMPRESSION/CONCLUSION/RECOMMENDATIONS)
    return text.replace(
      /(<h[1-6][^>]*>\s*)(IMPRESSION|CONCLUSION|RECOMMENDATIONS?|RECOMMENDATION)(:?\s*<\/h[1-6]>?)/gmi,
      '<div style="page-break-before: always;"></div>$1$2$3'
    );
  }
}

export default TextToHtmlService;