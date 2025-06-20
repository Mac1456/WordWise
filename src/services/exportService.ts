import { saveAs } from 'file-saver'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import jsPDF from 'jspdf'

export class ExportService {
  /**
   * Export document as plain text (.txt)
   */
  static exportAsTxt(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    saveAs(blob, `${filename}.txt`)
  }

  /**
   * Export document as Markdown (.md)
   */
  static exportAsMarkdown(content: string, filename: string, title?: string) {
    let markdownContent = content
    
    // Add title if provided
    if (title) {
      markdownContent = `# ${title}\n\n${content}`
    }
    
    // Basic formatting enhancements for markdown
    // Convert line breaks to proper markdown formatting
    markdownContent = markdownContent
      .replace(/\n\n/g, '\n\n')  // Preserve paragraph breaks
      .replace(/\n/g, '\n')      // Preserve line breaks
    
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' })
    saveAs(blob, `${filename}.md`)
  }

  /**
   * Export document as Word document (.docx)
   */
  static async exportAsDocx(content: string, filename: string, title?: string) {
    try {
      // Split content into paragraphs
      const paragraphs = content.split('\n\n').filter(p => p.trim())
      
      // Create document paragraphs
      const docParagraphs = []
      
      // Add title if provided
      if (title) {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                bold: true,
                size: 32, // 16pt font
              }),
            ],
            spacing: {
              after: 400, // Space after title
            },
          })
        )
      }
      
      // Add content paragraphs
      paragraphs.forEach(paragraph => {
        docParagraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: paragraph.trim(),
                size: 24, // 12pt font
              }),
            ],
            spacing: {
              after: 200, // Space between paragraphs
            },
          })
        )
      })
      
      // Create the document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: docParagraphs,
          },
        ],
      })
      
      // Generate buffer and save
      const buffer = await Packer.toBuffer(doc)
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      saveAs(blob, `${filename}.docx`)
    } catch (error) {
      console.error('Error exporting as DOCX:', error)
      throw new Error('Failed to export as Word document')
    }
  }

  /**
   * Export document as PDF (.pdf)
   */
  static exportAsPdf(content: string, filename: string, title?: string) {
    try {
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 20
      const lineHeight = 7
      const maxWidth = pageWidth - (margin * 2)
      
      let yPosition = margin
      
      // Add title if provided
      if (title) {
        pdf.setFontSize(18)
        pdf.setFont('helvetica', 'bold')
        const titleLines = pdf.splitTextToSize(title, maxWidth)
        
        titleLines.forEach((line: string) => {
          if (yPosition > pageHeight - margin) {
            pdf.addPage()
            yPosition = margin
          }
          pdf.text(line, margin, yPosition)
          yPosition += lineHeight + 3
        })
        
        yPosition += 10 // Extra space after title
      }
      
      // Add content
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      
      // Split content into paragraphs
      const paragraphs = content.split('\n\n').filter(p => p.trim())
      
      paragraphs.forEach((paragraph, index) => {
        if (index > 0) {
          yPosition += 5 // Space between paragraphs
        }
        
        const lines = pdf.splitTextToSize(paragraph.trim(), maxWidth)
        
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - margin) {
            pdf.addPage()
            yPosition = margin
          }
          pdf.text(line, margin, yPosition)
          yPosition += lineHeight
        })
      })
      
      // Save the PDF
      pdf.save(`${filename}.pdf`)
    } catch (error) {
      console.error('Error exporting as PDF:', error)
      throw new Error('Failed to export as PDF')
    }
  }

  /**
   * Get appropriate filename from document title
   */
  static sanitizeFilename(title: string): string {
    return title
      .replace(/[^a-z0-9]/gi, '_')  // Replace non-alphanumeric with underscore
      .replace(/_+/g, '_')          // Replace multiple underscores with single
      .replace(/^_|_$/g, '')        // Remove leading/trailing underscores
      .toLowerCase()
  }
} 