import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export class ExportService {
  /**
   * Export content as plain text
   */
  static exportAsText(content: string, filename: string = 'document.txt') {
    // Strip HTML tags and convert to plain text
    const plainText = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, filename);
  }

  /**
   * Export content as Markdown
   */
  static exportAsMarkdown(content: string, filename: string = 'document.md') {
    let markdown = content;
    
    // Convert HTML to Markdown
    markdown = markdown
      // Headers
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
      .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
      
      // Bold and Italic
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<u[^>]*>(.*?)<\/u>/gi, '<u>$1</u>')
      
      // Lists
      .replace(/<ul[^>]*>/gi, '')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      
      // Blockquotes
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
      
      // Code blocks
      .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      
      // Horizontal rules
      .replace(/<hr[^>]*>/gi, '\n---\n\n')
      
      // Paragraphs
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/p>/gi, '\n\n')
      
      // Line breaks
      .replace(/<br[^>]*>/gi, '\n')
      
      // Remove remaining HTML tags
      .replace(/<[^>]*>/g, '')
      
      // Clean up extra whitespace
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/&nbsp;/g, ' ')
      .trim();

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, filename);
  }

  /**
   * Export content as Word document (.docx)
   */
  static async exportAsDocx(content: string, filename: string = 'document.docx') {
    try {
      // Parse HTML content and convert to docx paragraphs
      const paragraphs = this.parseHtmlToDocxParagraphs(content);
      
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: paragraphs,
          },
        ],
      });

      const buffer = await Packer.toBlob(doc);
      saveAs(buffer, filename);
    } catch (error) {
      console.error('Error exporting as DOCX:', error);
      // Fallback to plain text
      this.exportAsText(content, filename.replace('.docx', '.txt'));
    }
  }

  /**
   * Export content as PDF
   */
  static async exportAsPdf(content: string, filename: string = 'document.pdf') {
    try {
      // Create a temporary div to render the content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '40px';
      tempDiv.style.fontFamily = 'Arial, sans-serif';
      tempDiv.style.fontSize = '14px';
      tempDiv.style.lineHeight = '1.6';
      tempDiv.style.color = '#000';
      tempDiv.style.backgroundColor = '#fff';
      
      document.body.appendChild(tempDiv);

      // Convert to canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      document.body.removeChild(tempDiv);

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(filename);
    } catch (error) {
      console.error('Error exporting as PDF:', error);
      // Fallback to plain text
      this.exportAsText(content, filename.replace('.pdf', '.txt'));
    }
  }

  /**
   * Parse HTML content to docx paragraphs
   */
  private static parseHtmlToDocxParagraphs(html: string): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    
    // Simple HTML parsing - in a real app, you'd want a more robust parser
    const lines = html
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br[^>]*>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .split('\n')
      .filter(line => line.trim());

    for (const line of lines) {
      if (line.trim()) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line.trim(),
                size: 24, // 12pt font
              }),
            ],
            spacing: {
              after: 200, // Space after paragraph
            },
          })
        );
      }
    }

    return paragraphs;
  }

  /**
   * Get file extension for export format
   */
  static getFileExtension(format: 'txt' | 'md' | 'docx' | 'pdf'): string {
    const extensions = {
      txt: '.txt',
      md: '.md',
      docx: '.docx',
      pdf: '.pdf'
    };
    return extensions[format];
  }

  /**
   * Generate filename with timestamp
   */
  static generateFilename(baseName: string = 'document', format: 'txt' | 'md' | 'docx' | 'pdf'): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const extension = this.getFileExtension(format);
    return `${baseName}_${timestamp}${extension}`;
  }
}

export default ExportService; 