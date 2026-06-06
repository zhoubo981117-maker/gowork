/**
 * SQLite 数据库初始化和管理
 * 支持 Android/iOS 原生 SQLite 和 Web AsyncStorage
 */

import { Platform } from 'react-native';
import { APIConfig, ChatMessage, InterviewStatus, Job, AIPersona } from './types';

/**
 * 将数据库行转换为 Job 对象
 * coreSkills 在数据库中以 JSON 字符串存储，读取时需要反序列化为数组
 */
function deserializeJob(row: any): Job {
  let coreSkills: string[] = [];
  if (Array.isArray(row.coreSkills)) {
    coreSkills = row.coreSkills;
  } else if (typeof row.coreSkills === 'string' && row.coreSkills.trim()) {
    try {
      const parsed = JSON.parse(row.coreSkills);
      coreSkills = Array.isArray(parsed) ? parsed : [];
    } catch {
      // 兼容旧数据：以逗号分隔的字符串
      coreSkills = row.coreSkills.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }
  return { ...row, coreSkills } as Job;
}

let db: any = null;
// 缓存「打开数据库 + 建表」的过程，确保任意读写之前表一定已创建
let readyPromise: Promise<any> | null = null;

/**
 * 打开数据库并确保所有表已创建。
 * 失败时抛出错误，并清空缓存以便下次调用重试。
 */
async function openAndPrepare(): Promise<any> {
  if (Platform.OS === 'web') {
    return null;
  }

  const { openDatabaseAsync } = await import('expo-sqlite');
  const database = await openDatabaseAsync('gowork.db');
  console.log('[DB] SQLite database opened');

  // 外键约束（聊天记录级联删除）
  try {
    await database.execAsync('PRAGMA foreign_keys = ON;');
  } catch (e) {
    console.warn('[DB] Failed to enable foreign_keys:', e);
  }

  await createTables(database);
  db = database;
  console.log('[DB] ✓ Database ready');
  return database;
}

/**
 * 获取已就绪的数据库实例（已建表）。
 * 所有读写都应通过此函数获取实例，避免在表创建完成前执行 SQL。
 */
async function getDatabase(): Promise<any> {
  if (Platform.OS === 'web') return null;
  if (db) return db;

  if (!readyPromise) {
    readyPromise = openAndPrepare().catch((error) => {
      // 允许后续调用重试，而不是永久卡在失败状态
      readyPromise = null;
      console.error('[DB] Failed to prepare database:', error);
      throw error;
    });
  }

  return readyPromise;
}

/**
 * 初始化数据库连接（在应用启动时后台调用）。
 * 真正的就绪保证在每次读写时通过 getDatabase() 完成。
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('[DB] Platform:', Platform.OS);
    await getDatabase();
  } catch (error) {
    // 后台初始化失败不阻塞 UI；后续读写会再次尝试并把错误暴露给用户
    console.error('[DB] Background initialization failed:', error);
  }
}

/**
 * 创建所有表（逐条执行，提升不同 SQLite 实现下的兼容性）。
 * 任一语句失败都会抛出错误，由调用方处理。
 */
async function createTables(database: any): Promise<void> {
  if (!database) return;

  console.log('[DB] Creating tables...');

  const statements = [
    `CREATE TABLE IF NOT EXISTS jobs (
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
      );`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        jobId TEXT NOT NULL,
        aiPersona TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE
      );`,
    `CREATE TABLE IF NOT EXISTS api_config (
        id TEXT PRIMARY KEY,
        baseUrl TEXT NOT NULL,
        apiKey TEXT NOT NULL,
        model TEXT NOT NULL,
        updatedAt INTEGER NOT NULL
      );`,
    `CREATE INDEX IF NOT EXISTS idx_chat_jobId_persona ON chat_messages(jobId, aiPersona);`,
    `CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat_messages(timestamp);`,
  ];

  for (const statement of statements) {
    await database.execAsync(statement);
  }

  console.log('[DB] Tables created successfully');
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
          JSON.stringify(job.coreSkills || []),
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
      return (result || []).map(deserializeJob);
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
      return result ? deserializeJob(result) : null;
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
          JSON.stringify(updatedJob.coreSkills || []),
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
