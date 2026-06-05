/**
 * 数据库 Context Provider
 * 提供全局数据库访问和状态管理
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { initializeDatabase } from './database';

interface DatabaseContextType {
  isReady: boolean;
  error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // 在后台初始化数据库，不阻塞 UI 渲染
    initializeDatabase().catch((err) => {
      console.error('[DB] Background initialization failed:', err);
    });
  }, []);

  return (
    <DatabaseContext.Provider value={{ isReady: true, error: null }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabaseReady() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabaseReady must be used within DatabaseProvider');
  }
  return context;
}
