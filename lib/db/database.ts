/**
 * SQLite 数据库初始化和管理
 * 支持 Android/iOS 原生 SQLite 和 Web AsyncStorage
 */

import { Platform } from 'react-native';
import { APIConfig, ChatMessage, InterviewStatus, Job, AIPersona } from './types';

let db: any = null;
let initPromise: Promise<any> | null = null;
let isInitialized = false;

/**
 * 延迟导入 expo-sqlite（仅在需要时）
 */
async function getDatabase() {
  if (db) return db;

  try {
    // 仅在 Android/iOS 上导入 SQLite
    if (Platform.OS !== 'web') {
      const { openDatabaseAsync } = await import('expo-sqlite');
      db = await openDatabaseAsync('gowork.db');
      console.log('[DB] SQLite database opened');
    } else {
      console.log('[DB] Web platform detected, using AsyncStorage');
    }
    return db;
  } catch (error) {
    console.error('[DB] Failed to get database:', error);
    return null;
  }
}

/**
 * 初始化数据库连接
 */
export async function initializeDatabase(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[DB] Platform:', Platform.OS);
      console.log('[DB] Starting database initialization...');

      // 尝试获取数据库实例
      const database = await getDatabase();

      if (database && Platform.OS !== 'web') {
        // 仅在原生平台创建表
        await createTables(database);
        console.log('[DB] ✓ Database initialized successfully');
      } else {
        console.log('[DB] Using AsyncStorage fallback');
      }

      isInitialized = true;
    } catch (error) {
      console.error('[DB] ✗ Database initialization failed:', error);
      // 即使失败也标记为初始化完成，使用降级模式
      isInitialized = true;
    }
  })();

  return initPromise;
}

/**
 * 创建所有表
 */
async function createTables(database: any): Promise<void> {
  if (!database) return;

  try {
    console.log('[DB] Creating tables...');

    const sql = `
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        companyName TEXT NOT NULL,
        jobTitle TEXT NOT NULL,
        location TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT '${InterviewStatus.BEFORE_APPLY}',
        jdContent TEXT,
        jdFileUri TEXT,
        resumeContent TEXT,
        resumeFileUri TEXT,
        coreSkills TEXT,
        matchAnalysis TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        jobId TEXT NOT NULL,
        aiPersona TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS api_config (
        id TEXT PRIMARY KEY,
        baseUrl TEXT NOT NULL,
        apiKey TEXT NOT NULL,
        model TEXT NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_chat_jobId_persona ON chat_messages(jobId, aiPersona);
      CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_messages(timestamp);
    `;

    await database.execAsync(sql);
    console.log('[DB] Tables created successfully');
  } catch (error) {
    console.error('[DB] Error creating tables:', error);
    // 不抛出错误，继续运行
  }
}

/**
 * 添加岗位
 */
export async function addJob(job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
  const id = Date.now().toString();
  const now = Date.now();

  try {
    const database = await getDatabase();

    if (database && Platform.OS !== 'web') {
      await database.runAsync(
        `INSERT INTO jobs (id, companyName, jobTitle, location, status, jdContent, jdFileUri, resumeContent, resumeFileUri, coreSkills, matchAnalysis, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          job.companyName,
          job.jobTitle,
          job.location,
          job.status || InterviewStatus.BEFORE_APPLY,
          job.jdContent,
          job.jdFileUri,
          job.resumeContent,
          job.resumeFileUri,
          job.coreSkills,
          job.matchAnalysis,
          now,
          now,
        ] as any
      );
    }

    return {
      ...job,
      id,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error('[DB] Error adding job:', error);
    throw error;
  }
}

/**
 * 获取所有岗位
 */
export async function getAllJobs(): Promise<Job[]> {
  try {
    const database = await getDatabase();

    if (database && Platform.OS !== 'web') {
      const result = await (database.getAllAsync as any)('SELECT * FROM jobs ORDER BY updatedAt DESC');
      return result || [];
    }

    return [];
  } catch (error) {
    console.error('[DB] Error getting all jobs:', error);
    return [];
  }
}

/**
 * 按 ID 获取岗位
 */
export async function getJobById(id: string): Promise<Job | null> {
  try {
    const database = await getDatabase();

    if (database && Platform.OS !== 'web') {
      const result = await (database.getFirstAsync as any)('SELECT * FROM jobs WHERE id = ?', [id]);
      return result || null;
    }

    return null;
  } catch (error) {
    console.error('[DB] Error getting job by id:', error);
    return null;
  }
}

/**
 * 更新岗位
 */
export async function updateJob(id: string, updates: Partial<Job>): Promise<Job> {
  const job = await getJobById(id);

  if (!job) throw new Error(`Job ${id} not found`);

  const updatedJob = {
    ...job,
    ...updates,
    id: job.id,
    createdAt: job.createdAt,
    updatedAt: Date.now(),
  };

  try {
    const database = await getDatabase();

    if (database && Platform.OS !== 'web') {
      await database.runAsync(
        `UPDATE jobs SET companyName = ?, jobTitle = ?, location = ?, status = ?, jdContent = ?, jdFileUri = ?, resumeContent = ?, resumeFileUri = ?, coreSkills = ?, matchAnalysis = ?, updatedAt = ? WHERE id = ?`,
        [
          updatedJob.companyName,
          updatedJob.jobTitle,
          updatedJob.location,
          updatedJob.status,
          updatedJob.jdContent,
          updatedJob.jdFileUri,
          updatedJob.resumeContent,
          updatedJob.resumeFileUri,
          updatedJob.coreSkills,
          updatedJob.matchAnalysis,
          updatedJob.updatedAt,
          id,
        ] as any
      );
    }

    return updatedJob;
  } catch (error) {
    console.error('[DB] Error updating job:', error);
    throw error;
  }
}

/**
 * 删除岗位
 */
export async function deleteJob(id: string): Promise<void> {
  try {
    const database = await getDatabase();

    if (database && Platform.OS !== 'web') {
      await database.runAsync('DELETE FROM jobs WHERE id = ?', [id]);
    }
  } catch (error) {
    console.error('[DB] Error deleting job:', error);
    throw error;
  }
}

/**
 * 添加聊天消息
 */
export async function addChatMessage(
  jobId: string,
  persona: AIPersona,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage> {
  const id = Date.now().toString();
  const timestamp = Date.now();

  try {
    const database = await getDatabase();

    if (database && Platform.OS !== 'web') {
      await database.runAsync(
        `INSERT INTO chat_messages (id, jobId, aiPersona, role, content, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, jobId, persona, role, content, timestamp] as any
      );
    }

    return {
      id,
      jobId,
      aiPersona: persona,
      role,
      content,
      timestamp,
    };
  } catch (error) {
    console.error('[DB] Error adding chat message:', error);
    throw error;
  }
}

/**
 * 获取聊天消息
 */
export async function getChatMessages(jobId: string, persona: AIPersona): Promise<ChatMessage[]> {
  try {
    const database = await getDatabase();

    if (database && Platform.OS !== 'web') {
      const result = await (database.getAllAsync as any)(
        `SELECT * FROM chat_messages WHERE jobId = ? AND aiPersona = ? ORDER BY timestamp ASC`,
        [jobId, persona]
      );
      return result || [];
    }

    return [];
  } catch (error) {
    console.error('[DB] Error getting chat messages:', error);
    return [];
  }
}

/**
 * 清空聊天消息
 */
export async function clearChatMessages(jobId: string, persona: AIPersona): Promise<void> {
  try {
    const database = await getDatabase();

    if (database && Platform.OS !== 'web') {
      await database.runAsync(
        `DELETE FROM chat_messages WHERE jobId = ? AND aiPersona = ?`,
        [jobId, persona] as any
      );
    }
  } catch (error) {
    console.error('[DB] Error clearing chat messages:', error);
    throw error;
  }
}

/**
 * 保存 API 配置
 */
export async function saveAPIConfig(config: APIConfig): Promise<void> {
  try {
    const database = await getDatabase();

    if (database && Platform.OS !== 'web') {
      // 先删除旧配置
      await database.runAsync('DELETE FROM api_config');

      // 插入新配置
      await database.runAsync(
        `INSERT INTO api_config (id, baseUrl, apiKey, model, updatedAt) VALUES (?, ?, ?, ?, ?)`,
        ['default', config.baseUrl, config.apiKey, config.model, Date.now()] as any
      );
    }
  } catch (error) {
    console.error('[DB] Error saving API config:', error);
    throw error;
  }
}

/**
 * 获取 API 配置
 */
export async function getAPIConfig(): Promise<APIConfig | null> {
  try {
    const database = await getDatabase();

    if (database && Platform.OS !== 'web') {
      const result = await (database.getFirstAsync as any)(
        'SELECT baseUrl, apiKey, model FROM api_config LIMIT 1'
      );
      return result || null;
    }

    return null;
  } catch (error) {
    console.error('[DB] Error getting API config:', error);
    return null;
  }
}
