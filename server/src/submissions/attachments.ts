/** Rules for files students attach to performance tasks. */

export const MAX_ATTACHMENT_BYTES = 1024 * 1024;

interface AllowedType {
  contentType: string;
  extensions: string[];
  matches: (bytes: Buffer) => boolean;
}

const startsWith = (bytes: Buffer, signature: number[]): boolean =>
  bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte);

const ALLOWED: AllowedType[] = [
  { contentType: 'application/pdf', extensions: ['pdf'], matches: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46]) },
  { contentType: 'image/png', extensions: ['png'], matches: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47]) },
  { contentType: 'image/jpeg', extensions: ['jpg', 'jpeg'], matches: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  {
    // .docx files are zip archives.
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extensions: ['docx'],
    matches: (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]),
  },
  { contentType: 'text/plain', extensions: ['txt'], matches: (b) => !b.includes(0) },
];

export const ATTACHMENT_HELP = 'PDF, PNG, JPG, DOCX or TXT, up to 1 MB.';

/** Removes path parts and odd characters from an uploaded file name. */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const cleaned = base.replace(/[^\w .()-]/g, '_').replace(/^\.+/, '').trim().slice(0, 120);
  return cleaned || 'attachment';
}

/**
 * Checks an upload by its real bytes, not just the name the browser claims, so a
 * renamed program or script can't be stored as a "PDF". Returns the accepted
 * content type, or an error message.
 */
export function checkAttachment(fileName: string, claimedType: string, bytes: Buffer): { contentType: string } | { error: string } {
  if (bytes.length === 0) return { error: 'That file is empty.' };
  if (bytes.length > MAX_ATTACHMENT_BYTES) return { error: 'That file is too large. The limit is 1 MB.' };
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  const allowed = ALLOWED.find((type) => type.extensions.includes(extension));
  if (!allowed || (claimedType && claimedType !== allowed.contentType && claimedType !== 'application/octet-stream')) {
    return { error: `That file type is not allowed. Use ${ATTACHMENT_HELP}` };
  }
  if (!allowed.matches(bytes)) return { error: 'That file does not look like a real ' + extension.toUpperCase() + ' file.' };
  return { contentType: allowed.contentType };
}
