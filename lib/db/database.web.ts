/**
 * Web 平台的数据库实现（使用 AsyncStorage）
 * 在 web 上用 AsyncStorage 替代 SQLite，保持相同的 API
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { APIConfig, ChatMessage, InterviewStatus, Job, AIPersona } from './types';

interface StorageData {
  jobs: Record<string, Job>;
  chatMessages: Record<string, ChatMessage[]>;
  apiConfig: APIConfig | null;
}

const STORAGE_KEY = 'gowork_data';

let cachedData: StorageData = { jobs: {}, chatMessages: {}, apiConfig: null };

/**
 * 从 AsyncStorage 加载数据
 */
async function loadData(): Promise<StorageData> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    cachedData = data ? JSON.parse(data) : { jobs: {}, chatMessages: {}, apiConfig: null };
    return cachedData;
  } catch (error) {
    console.error('Failed to load data from AsyncStorage:', error);
    return cachedData;
  }
}

/**
 * 保存数据到 AsyncStorage
 */
async function saveData(data: StorageData): Promise<void> {
  try {
    cachedData = data;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data to AsyncStorage:', error);
  }
}

/**
 * 初始化数据库（web 版本 - 无操作）
 */
export async function initializeDatabase(): Promise<any> {
  console.log('✓ Web database initialized (using AsyncStorage)');
  return null;
}

/**
 * 获取数据库实例（web 版本 - 返回 null）
 */
export function getDatabase(): any {
  return null;
}

/**
 * 添加岗位
 */
export async function addJob(job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>): Promise<Job> {
  const data = await loadData();
  const id = Date.now().toString();
  const now = Date.now();
  const newJob: Job = {
    ...job,
    id,
    createdAt: now,
    updatedAt: now,
  };
  data.jobs[id] = newJob;
  await saveData(data);
  return newJob;
}

/**
 * 获取所有岗位
 */
export async function getAllJobs(): Promise<Job[]> {
  const data = await loadData();
  return Object.values(data.jobs);
}

/**
 * 按 ID 获取岗位
 */
export async function getJobById(id: string): Promise<Job | null> {
  const data = await loadData();
  return data.jobs[id] || null;
}

/**
 * 更新岗位
 */
export async function updateJob(id: string, updates: Partial<Job>): Promise<Job> {
  const data = await loadData();
  const job = data.jobs[id];
  if (!job) throw new Error(`Job ${id} not found`);
  data.jobs[id] = {
    ...job,
    ...updates,
    id: job.id,
    createdAt: job.createdAt,
    updatedAt: Date.now(),
  };
  await saveData(data);
  return data.jobs[id];
}

/**
 * 删除岗位
 */
export async function deleteJob(id: string): Promise<void> {
  const data = await loadData();
  delete data.jobs[id];
  delete data.chatMessages[id];
  await saveData(data);
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
  const data = await loadData();
  const id = Date.now().toString();
  const message: ChatMessage = {
    id,
    jobId,
    aiPersona: persona,
    role,
    content,
    timestamp: Date.now(),
  };
  if (!data.chatMessages[jobId]) {
    data.chatMessages[jobId] = [];
  }
  data.chatMessages[jobId].push(message);
  await saveData(data);
  return message;
}

/**
 * 获取聊天消息
 */
export async function getChatMessages(jobId: string, persona: AIPersona): Promise<ChatMessage[]> {
  const data = await loadData();
  return (data.chatMessages[jobId] || []).filter((msg) => msg.aiPersona === persona);
}

/**
 * 清空聊天消息
 */
export async function clearChatMessages(jobId: string, persona: AIPersona): Promise<void> {
  const data = await loadData();
  if (data.chatMessages[jobId]) {
    data.chatMessages[jobId] = data.chatMessages[jobId].filter(
      (msg) => msg.aiPersona !== persona
    );
  }
  await saveData(data);
}

/**
 * 保存 API 配置
 */
export async function saveAPIConfig(config: APIConfig): Promise<void> {
  const data = await loadData();
  data.apiConfig = {
    ...config,
    updatedAt: Date.now(),
  };
  await saveData(data);
}

/**
 * 获取 API 配置
 */
export async function getAPIConfig(): Promise<APIConfig | null> {
  const data = await loadData();
  return data.apiConfig || null;
}
