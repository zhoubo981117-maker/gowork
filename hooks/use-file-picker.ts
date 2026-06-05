/**
 * 文件选择和处理 Hook
 */

import { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
  base64?: string;
}

export function useFilePicker() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const pickFile = useCallback(async (): Promise<PickedFile | null> => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return null;
      }

      const asset = result.assets[0];
      if (!asset) return null;

      // 读取文件内容为 Base64
      let base64: string | undefined;
      try {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch (err) {
        console.warn('Failed to read file as base64:', err);
      }

      const file: PickedFile = {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
        base64,
      };

      setError(null);
      return file;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to pick file');
      setError(error);
      Alert.alert('错误', '文件选择失败');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    pickFile,
    isLoading,
    error,
  };
}
