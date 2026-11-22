export interface CaptionExportInput {
  caption?: string;
  sourceUrl?: string;
  author?: string;
}

export function buildCaptionExport(input: CaptionExportInput): string {
  const blocks: string[] = [];
  const caption = input.caption?.trim();

  if (caption) {
    blocks.push(caption);
  }

  const metadata: string[] = [];

  if (input.author) {
    metadata.push(`Account: @${input.author.replace(/^@/, '')}`);
  }

  if (input.sourceUrl) {
    metadata.push(`Source: ${input.sourceUrl}`);
  }

  if (metadata.length > 0) {
    blocks.push(metadata.join('\n'));
  }

  return blocks.join('\n\n') || 'No caption or source URL is available.';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      return copied;
    } catch {
      return false;
    }
  }
}
