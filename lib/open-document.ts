/**
 * 打开/查看本地文档（简历、岗位 JD）
 *
 * 优先使用导入时缓存的原始文件；若缓存已被清理，则用存储的 Base64 内容
 * 在本地重新生成文件，再交由系统分享面板用合适的应用打开。
 */

import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Alert } from 'react-native';

/** 粗略判断字符串是否为文件 Base64 内容 */
function looksLikeBase64(content: string): boolean {
  if (!content) return false;
  const stripped = content.replace(/\s/g, '');
  if (stripped.length < 512) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(stripped.slice(0, 1024));
}

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  txt: 'text/plain',
};

function extOf(uriOrName: string): string {
  const match = /\.([a-zA-Z0-9]+)(?:\?|#|$)/.exec(uriOrName || '');
  return match ? match[1].toLowerCase() : '';
}

function mimeFor(uriOrName: string): string | undefined {
  return MIME_BY_EXT[extOf(uriOrName)];
}

interface OpenDocumentOptions {
  /** 导入时缓存的文件路径（file://...） */
  fileUri?: string;
  /** 存储的内容：可能是 Base64，也可能就是文件 uri */
  content?: string;
  /** 用于推断扩展名/命名的展示名 */
  displayName?: string;
}

/**
 * 尝试查看一个文档。成功打开返回 true，否则给出提示并返回 false。
 */
export async function openDocument(opts: OpenDocumentOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    Alert.alert('暂不支持', 'Web 端暂不支持查看本地文件');
    return false;
  }

  try {
    let targetUri = opts.fileUri;

    // 1) 优先使用缓存文件；不存在则置空，走 Base64 兜底
    if (targetUri) {
      try {
        const info = await FileSystem.getInfoAsync(targetUri);
        if (!info.exists) targetUri = undefined;
      } catch {
        targetUri = undefined;
      }
    }

    // 2) 缓存文件不可用时，用 Base64 内容重建文件
    if (!targetUri && opts.content && looksLikeBase64(opts.content)) {
      const ext =
        extOf(opts.fileUri || '') || extOf(opts.displayName || '') || 'pdf';
      const safeBase =
        (opts.displayName || 'document').replace(/[^\w.\-一-龥]/g, '_').replace(/\.[^.]+$/, '') ||
        'document';
      const target = `${FileSystem.cacheDirectory}${safeBase}-${Date.now()}.${ext}`;
      await FileSystem.writeAsStringAsync(target, opts.content, {
        encoding: FileSystem.EncodingType.Base64,
      });
      targetUri = target;
    }

    // 3) 内容本身就是一个 uri 的情况
    if (!targetUri && opts.content && /^(file|content):\/\//.test(opts.content)) {
      targetUri = opts.content;
    }

    if (!targetUri) {
      Alert.alert('无法查看', '找不到原始文件，可能缓存已被系统清理。请重新导入该文件。');
      return false;
    }

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('无法查看', '当前设备不支持打开此类文件');
      return false;
    }

    const mimeType = mimeFor(targetUri) || mimeFor(opts.displayName || '');
    await Sharing.shareAsync(targetUri, {
      mimeType,
      dialogTitle: opts.displayName || '查看文档',
      UTI: mimeType === 'application/pdf' ? 'com.adobe.pdf' : undefined,
    });
    return true;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    Alert.alert('无法查看', `打开文件失败\n\n${detail}`);
    return false;
  }
}
