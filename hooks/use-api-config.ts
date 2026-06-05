/**
 * API 配置管理 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { APIConfig } from '@/lib/db/types';
import { getAPIConfig, saveAPIConfig } from '@/lib/db/database';

export function useAPIConfig() {
  const [config, setConfig] = useState<APIConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 加载配置 - 延迟加载
  useEffect(() => {
    const timer = setTimeout(() => {
      const loadConfig = async () => {
        try {
          setIsLoading(true);
          const savedConfig = await getAPIConfig();
          setConfig(savedConfig);
          setError(null);
        } catch (err) {
          console.error('[useAPIConfig] Error loading config:', err);
          setError(err instanceof Error ? err : new Error('Failed to load API config'));
        } finally {
          setIsLoading(false);
        }
      };

      loadConfig();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // 更新配置
  const updateConfig = useCallback(async (newConfig: Omit<APIConfig, 'updatedAt'>) => {
    try {
      setIsLoading(true);
      await saveAPIConfig(newConfig as APIConfig);

      // 保存后重新读取配置
      const savedConfig = await getAPIConfig();
      setConfig(savedConfig);
      setError(null);
      return savedConfig;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save API config');
      console.error('[useAPIConfig] Error updating config:', error);
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    config,
    isLoading,
    error,
    updateConfig,
    isConfigured: config !== null && config.baseUrl && config.apiKey,
  };
}
