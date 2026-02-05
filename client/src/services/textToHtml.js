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
      /^(CLINICAL HISTORY|HISTORY|INDICATION|CLINICAL INFORMATION|REASON FOR STUDY):?\s*(.*)$/gmi,
      /^(FINDINGS|OBSERVATION|OBSERVATIONS|RADIOLOGICAL FINDINGS|IMAGING FINDINGS):?\s*(.*)$/gmi,
      /^(IMPRESSION|CONCLUSION|DIAGNOSIS|RADIOLOGICAL IMPRESSION|FINAL DIAGNOSIS):?\s*(.*)$/gmi,
      /^(RECOMMENDATIONS?|ADVICE|FOLLOW[- ]?UP|FURTHER MANAGEMENT):?\s*(.*)$/gmi
    ];

    primarySections.forEach(pattern => {
      text = text.replace(pattern, (match, header, content) => {
        const headerStyle = `
          color: #1f2937; 
          font-weight: 700; 
          text-decoration: underline; 
          margin: 18px 0 10px 0; 
          font-size: 12pt;
          padding: 8px 0;
          border-left: 3px solid #374151;
          padding-left: 12px;
          letter-spacing: 0.5px;
        `;
        return `<h3 style="${headerStyle}">${header.toUpperCase()}:</h3>${content ? `<p>${content}</p>` : ''}`;
      });
    });

    // Secondary sections
    const secondarySections = [
      /^(TECHNIQUE|PROCEDURE|METHOD|METHODOLOGY|COMPARISON|PRIOR STUDIES?|PREVIOUS STUDIES?|CONTRAST|PROTOCOL):?\s*(.*)$/gmi
    ];

    secondarySections.forEach(pattern => {
      text = text.replace(pattern, (match, header, content) => {
        const headerStyle = `
          color: #374151; 
          font-weight: 600; 
          margin: 14px 0 8px 0; 
          font-size: 11pt;
          text-transform: uppercase;
          letter-spacing: 0.3px;
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
      return `<li style="margin: 6px 0; line-height: 1.6; color: #374151;">${cleanItem}</li>`;
    });

    // Wrap consecutive numbered list items
    text = text.replace(/(<li[^>]*>.*?<\/li>\s*)+/gs, (match) => {
      return `<ol style="margin: 12px 0; padding-left: 28px; color: #374151; font-weight: 500;">${match}</ol>`;
    });

    // Bulleted lists
    text = text.replace(/^([-•*]\s+.+)$/gm, (match, item) => {
      const cleanItem = item.replace(/^[-•*]\s*/, '');
      return `<li style="margin: 6px 0; line-height: 1.6; color: #374151;">${cleanItem}</li>`;
    });

    // Wrap consecutive bulleted list items
    text = text.replace(/(<li[^>]*>.*?<\/li>\s*(?:<ol[^>]*>.*?<\/ol>\s*)?)+/gs, (match) => {
      if (match.includes('<ol')) return match; // Skip if already wrapped in ol
      return `<ul style="margin: 12px 0; padding-left: 28px; color: #374151; font-weight: 500;">${match}</ul>`;
    });

    return text;
  }

  /**
   * Enhanced medical terms formatting with expanded dictionary
   */
  static formatMedicalTerms(text) {
    // Critical findings (bold emphasis)
    const criticalFindings = [
      /\b(NORMAL|ABNORMAL|NEGATIVE|POSITIVE|WNL|WITHIN\s+NORMAL\s+LIMITS?)\b/gi,
      /\b(NO\s+(?:EVIDENCE|SIGNS?|ACUTE|ACTIVE|SIGNIFICANT|ABNORMALITIES?|PATHOLOGY|DISEASE))\b/gi,
      /\b(UNREMARKABLE|REMARKABLE|PATHOLOGICAL|NON[-\s]?SPECIFIC)\b/gi,
      /\b(EMERGENT|URGENT|CRITICAL|STAT|IMMEDIATE)\b/gi
    ];

    criticalFindings.forEach(pattern => {
      text = text.replace(pattern, '<strong style="color: #111827; font-weight: 700;">$1</strong>');
    });

    // Severity indicators (medium emphasis)
    const severityIndicators = [
      /\b(MILD|MODERATE|SEVERE|MARKED|EXTENSIVE|MINIMAL|SUBTLE|PROMINENT|SIGNIFICANT)\b/gi,
      /\b(ACUTE|CHRONIC|SUBACUTE|PROGRESSIVE|STABLE|IMPROVED|WORSENED|RESOLVED)\b/gi,
      /\b(FOCAL|DIFFUSE|LOCALIZED|GENERALIZED|BILATERAL|UNILATERAL|MULTIFOCAL)\b/gi,
      /\b(COMPLETE|INCOMPLETE|PARTIAL|TOTAL|NEAR[-\s]?COMPLETE)\b/gi
    ];

    severityIndicators.forEach(pattern => {
      text = text.replace(pattern, '<span style="color: #1f2937; font-weight: 600;">$1</span>');
    });

    // Measurements and values (subtle emphasis)
    text = text.replace(/(\d+(?:\.\d+)?\s*(?:mm|cm|ml|mg|kg|g|%|degrees?|x|cm2|cm3|ml\/min|mmHg|bpm|Hz|mSv|kVp|mAs|sec|min|hours?|days?|weeks?|months?|years?))\b/gi, 
      '<span style="font-weight: 600; color: #374151; border-bottom: 1px solid #d1d5db; padding-bottom: 1px;">$1</span>');

    // Expanded imaging modalities and equipment
    const imagingModalities = [
      /\b(radiograph|X[-\s]?ray|CT|MRI|MRA|MRV|ultrasound|US|echocardiogram|echo|electrocardiogram|ECG|EKG)\b/gi,
      /\b(mammography|fluoroscopy|angiography|arteriography|venography|myelography|cholangiography)\b/gi,
      /\b(PET|SPECT|nuclear medicine|scintigraphy|bone scan|thyroid scan|cardiac catheterization)\b/gi,
      /\b(DEXA|densitometry|tomosynthesis|stereotactic|biopsy|intervention|drainage)\b/gi,
      /\b(T1[-\s]?weighted|T2[-\s]?weighted|FLAIR|DWI|ADC|perfusion|spectroscopy|DTI)\b/gi,
      /\b(contrast[-\s]?enhanced|non[-\s]?contrast|pre[-\s]?contrast|post[-\s]?contrast|gadolinium|iodine)\b/gi
    ];

    imagingModalities.forEach(pattern => {
      text = text.replace(pattern, '<em style="color: #374151; font-style: italic; font-weight: 500;">$1</em>');
    });

    // Expanded anatomical terms
    const anatomicalTerms = [
      /\b(anterior|posterior|lateral|medial|superior|inferior|proximal|distal|cranial|caudal)\b/gi,
      /\b(sagittal|coronal|axial|transverse|oblique|longitudinal|cross[-\s]?sectional)\b/gi,
      /\b(bilateral|unilateral|symmetrical|asymmetrical|ipsilateral|contralateral)\b/gi,
      /\b(superficial|deep|subcutaneous|intramuscular|intravenous|arterial|venous)\b/gi,
      /\b(cervical|thoracic|lumbar|sacral|coccygeal|vertebral|spinal|epidural|subdural)\b/gi,
      /\b(intracranial|extracranial|intraorbital|extraorbital|retro[-\s]?orbital)\b/gi,
      /\b(pulmonary|cardiac|hepatic|renal|splenic|pancreatic|gastric|intestinal)\b/gi,
      /\b(abdominal|pelvic|thoracic|cervical|cranial|facial|orbital|nasal|paranasal)\b/gi
    ];

    anatomicalTerms.forEach(pattern => {
      text = text.replace(pattern, '<span style="color: #4b5563; font-weight: 500; font-style: italic;">$1</span>');
    });

    // Medical conditions and pathology (expanded)
    const medicalConditions = [
      /\b(pneumonia|pneumothorax|pleural effusion|atelectasis|consolidation|infiltrate|opacity)\b/gi,
      /\b(fracture|dislocation|arthritis|osteoporosis|osteomyelitis|tumor|mass|lesion)\b/gi,
      /\b(aneurysm|stenosis|occlusion|thrombosis|embolism|ischemia|infarction|hemorrhage)\b/gi,
      /\b(edema|inflammation|infection|abscess|hematoma|seroma|cyst|polyp)\b/gi,
      /\b(cardiomegaly|hepatomegaly|splenomegaly|lymphadenopathy|organomegaly)\b/gi,
      /\b(calcification|calcified|ossification|sclerosis|fibrosis|scarring|adhesions)\b/gi,
      /\b(dilatation|dilation|distension|compression|impingement|displacement)\b/gi,
      /\b(hypertrophy|atrophy|hyperplasia|dysplasia|metaplasia|neoplasia|malignancy)\b/gi
    ];

    medicalConditions.forEach(pattern => {
      text = text.replace(pattern, '<span style="color: #1f2937; font-weight: 600; text-decoration: underline; text-decoration-style: dotted;">$1</span>');
    });

    // Laboratory values and normal ranges
    const labValues = [
      /\b(elevated|decreased|increased|reduced|low|high|normal|borderline|within limits)\b/gi,
      /\b(WBC|RBC|hemoglobin|hematocrit|platelet|glucose|creatinine|BUN|GFR)\b/gi,
      /\b(sodium|potassium|chloride|CO2|calcium|magnesium|phosphorus|protein|albumin)\b/gi,
      /\b(bilirubin|alkaline phosphatase|ALT|AST|LDH|amylase|lipase|troponin|BNP)\b/gi
    ];

    labValues.forEach(pattern => {
      text = text.replace(pattern, '<span style="color: #374151; font-weight: 500; background-color: #f9fafb; padding: 1px 3px; border-radius: 3px;">$1</span>');
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
        return `<h4 style="color: #374151; font-weight: 600; margin: 14px 0 8px 0; font-size: 11pt; text-transform: uppercase; letter-spacing: 0.3px;">${trimmed}</h4>`;
      }
      
      // Regular paragraph
      const cleaned = trimmed.replace(/\n/g, ' ').replace(/\s+/g, ' ');
      return `<p style="margin: 8px 0; line-height: 1.6; color: #374151; text-align: justify;">${cleaned}</p>`;
    }).filter(p => p).join('\n');
  }

  /**
   * Wrap in medical report container
   */
  static wrapInMedicalContainer(html, { fontFamily, fontSize, lineHeight }) {
    return `
      <div style="
        font-family: ${fontFamily}, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: ${fontSize};
        line-height: ${lineHeight};
        color: #374151;
        margin: 0;
        padding: 24px;
        background-color: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        max-width: 21cm;
        margin: 0 auto;
        letter-spacing: 0.2px;
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

  // ✅ Escape HTML characters to avoid injection and allow safe processing
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

  // ✅ Simple page-break inserter before major sections
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