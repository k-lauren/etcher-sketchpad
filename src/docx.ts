import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

/**
 * Generate a .docx Blob from a title + body content.
 * The body uses a very small markdown-ish grammar:
 *   # / ## / ### at line-start   → Heading 1/2/3
 *   - or * at line-start          → bullet
 *   blank line                    → paragraph break
 * Everything else is plain paragraph text. **bold** / *italic* inline.
 */
export async function generateDocx(title: string, body: string): Promise<Blob> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: title, bold: true, size: 40 })],
    })
  );

  const lines = body.replace(/\r\n/g, '\n').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim() === '') {
      children.push(new Paragraph({ children: [] }));
      continue;
    }
    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const h =
        level === 1
          ? HeadingLevel.HEADING_1
          : level === 2
          ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_3;
      children.push(
        new Paragraph({
          heading: h,
          children: inlineRuns(text),
        })
      );
      continue;
    }
    const bulletMatch = /^[-*]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: inlineRuns(bulletMatch[1]),
        })
      );
      continue;
    }
    children.push(new Paragraph({ children: inlineRuns(line) }));
  }

  const doc = new Document({
    creator: 'Etcher Sketchpad',
    title,
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}

function inlineRuns(text: string): TextRun[] {
  // Very small inline parser: supports **bold** and *italic*
  const out: TextRun[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) {
      out.push(new TextRun(text.slice(lastIdx, m.index)));
    }
    if (m[2] !== undefined) {
      out.push(new TextRun({ text: m[2], bold: true }));
    } else if (m[4] !== undefined) {
      out.push(new TextRun({ text: m[4], italics: true }));
    }
    lastIdx = re.lastIndex;
  }
  if (lastIdx < text.length) {
    out.push(new TextRun(text.slice(lastIdx)));
  }
  return out.length ? out : [new TextRun(text)];
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBlob(base64: string, mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
