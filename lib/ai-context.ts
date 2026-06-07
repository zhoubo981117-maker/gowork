/**
 * AI 上下文构建工具
 *
 * 上传的简历/JD 文件以 Base64 形式存储。直接把 Base64 当作文本塞进
 * 提示词会让请求体巨大且无意义，常导致接口返回 400（超长 / 非法输入）。
 * 这里负责识别并剔除二进制 Base64，并对超长文本做截断，避免请求失败。
 */

// 注入提示词的纯文本最大长度
const MAX_TEXT_LENGTH = 6000;

/**
 * 粗略判断字符串是否为（文件）Base64 内容。
 * 纯文本 JD/简历通常含有空格、中文、标点；Base64 仅由 A-Za-z0-9+/= 组成。
 */
export function looksLikeBase64(content: string): boolean {
  if (!content) return false;
  const stripped = content.replace(/\s/g, '');
  if (stripped.length < 512) return false;
  // 取前若干字符判断字符集，避免对超长字符串做整体正则
  const sample = stripped.slice(0, 1024);
  return /^[A-Za-z0-9+/]+={0,2}$/.test(sample);
}

export interface DocSection {
  /** 注入提示词的文本片段（可能为空） */
  text: string;
  /** 是否因为是二进制文件而被省略 */
  omitted: boolean;
}

/**
 * 将存储的文件内容转换为可安全注入提示词的文本。
 * - 二进制 Base64：省略正文，omitted=true
 * - 纯文本：超长则截断
 */
export function buildDocSection(content: string | undefined | null): DocSection {
  if (!content) return { text: '', omitted: false };
  if (looksLikeBase64(content)) return { text: '', omitted: true };
  if (content.length > MAX_TEXT_LENGTH) {
    return { text: `${content.slice(0, MAX_TEXT_LENGTH)}\n…（内容过长已截断）`, omitted: false };
  }
  return { text: content, omitted: false };
}

/**
 * 生成一段带标题的文档上下文。二进制文件会注明无法解析，避免接口报错。
 */
export function describeDocument(title: string, content: string | undefined | null): string {
  const { text, omitted } = buildDocSection(content);
  if (omitted) {
    return `${title}：（用户上传的是文件，暂无法在此解析其文本内容，请基于其他已知信息进行回答）`;
  }
  if (!text) return '';
  return `${title}：\n${text}`;
}

// ---- 多模态（视觉）支持 ----

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'heic', 'heif']);

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  heic: 'image/heic',
  heif: 'image/heif',
};

/** 从文件 uri/名称推断 MIME 类型 */
export function inferMimeFromUri(uri?: string | null): string | undefined {
  if (!uri) return undefined;
  const m = /\.([a-zA-Z0-9]+)(?:\?|#|$)/.exec(uri);
  const ext = m ? m[1].toLowerCase() : '';
  return MIME_BY_EXT[ext];
}

export function isImageMime(mime?: string | null, fileUri?: string | null): boolean {
  if (mime && mime.startsWith('image/')) return true;
  const m = /\.([a-zA-Z0-9]+)(?:\?|#|$)/.exec(fileUri || '');
  return m ? IMAGE_EXT.has(m[1].toLowerCase()) : false;
}

export interface DocInput {
  label: string;
  content?: string | null;
  fileUri?: string | null;
  mimeType?: string | null;
}

// OpenAI 兼容的多模态内容块
type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

/**
 * 构建发给模型的 user 内容。
 * - 图片文件（Base64）：以 image_url 块发送，支持视觉的模型可直接读取
 * - 其他（文本/PDF 等）：走 describeDocument 文本注入
 * 返回纯字符串（无图片）或内容块数组（含图片）。
 */
export function buildUserContent(
  instruction: string,
  docs: DocInput[]
): string | ContentPart[] {
  const textChunks: string[] = [instruction];
  const images: ContentPart[] = [];

  for (const d of docs) {
    const mime = d.mimeType || inferMimeFromUri(d.fileUri);
    if (d.content && looksLikeBase64(d.content) && isImageMime(mime, d.fileUri)) {
      const dataUrl = `data:${mime || 'image/jpeg'};base64,${d.content.replace(/\s/g, '')}`;
      images.push({ type: 'image_url', image_url: { url: dataUrl } });
      textChunks.push(`${d.label}：见随附图片。`);
    } else {
      const section = describeDocument(d.label, d.content);
      if (section) textChunks.push(section);
    }
  }

  if (images.length === 0) return textChunks.join('\n\n');
  return [{ type: 'text', text: textChunks.join('\n\n') }, ...images];
}

/** 纯文本版本（用于视觉请求失败后的降级重试），永不包含图片 */
export function buildTextOnlyContent(instruction: string, docs: DocInput[]): string {
  const chunks = [instruction];
  for (const d of docs) {
    const section = describeDocument(d.label, d.content);
    if (section) chunks.push(section);
  }
  return chunks.join('\n\n');
}

/** 判断内容是否包含图片块 */
export function hasImageParts(content: string | ContentPart[]): boolean {
  return Array.isArray(content) && content.some((p) => p.type === 'image_url');
}
