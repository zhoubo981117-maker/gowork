/**
 * 数据库类型定义
 */

// 面试状态枚举
export enum InterviewStatus {
  BEFORE_APPLY = 'before_apply',      // 投递前
  APPLIED = 'applied',                 // 投递中
  FIRST_ROUND = 'first_round',         // 一面
  SECOND_ROUND = 'second_round',       // 二面
  OFFER_RECEIVED = 'offer_received',   // 已拿 offer
  REJECTED = 'rejected',               // 面试未通过
}

// AI 身份类型
export enum AIPersona {
  RESUME_COACH = 'resume_coach',           // 简历优化导师
  TECH_INTERVIEWER = 'tech_interviewer',   // 严格的技术面试官
  HR_BILINGUAL = 'hr_bilingual',           // 外企双语 HR
  INTERVIEW_COACH = 'interview_coach',     // 客观的复盘导师
}

// 岗位信息
export interface Job {
  id: string;
  companyName: string;
  jobTitle: string;
  location: string;
  status: InterviewStatus;
  jdContent: string;              // JD 原始内容（文本或 Base64）
  jdFileUri: string;              // JD 文件本地路径
  resumeContent: string;          // 简历原始内容
  resumeFileUri: string;          // 简历文件本地路径
  coreSkills: string[];           // AI 提取的核心技能需求
  matchAnalysis: string;          // 人岗匹配度分析文本
  createdAt: number;              // 创建时间戳
  updatedAt: number;              // 更新时间戳
}

// 聊天消息
export interface ChatMessage {
  id: string;
  jobId: string;
  aiPersona: AIPersona;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// API 配置
export interface APIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  updatedAt: number;
}

// 聊天会话（用于管理当前对话状态）
export interface ChatSession {
  jobId: string;
  aiPersona: AIPersona;
  messages: ChatMessage[];
}
