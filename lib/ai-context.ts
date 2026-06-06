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
