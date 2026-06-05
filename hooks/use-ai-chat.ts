/**
 * AI 聊天服务 Hook
 */

import { useState, useCallback } from 'react';
import axios from 'axios';
import { useAPIConfig } from './use-api-config';
import { AIPersona, Job } from '@/lib/db/types';

interface ChatRequest {
  jobId: string;
  job: Job;
  persona: AIPersona;
  userMessage: string;
}

interface ChatResponse {
  content: string;
  error?: string;
}

// AI 身份的系统提示词模板
const personaPrompts: Record<AIPersona, string> = {
  [AIPersona.RESUME_COACH]: `你是一位专业的简历优化导师。你的目标是帮助用户根据岗位 JD 挖掘和优化他们的简历亮点。
  
  你应该：
  1. 分析岗位的核心需求
  2. 指出简历中与岗位匹配的部分
  3. 建议如何更好地表达相关经验
  4. 提供具体的优化建议
  
  保持专业、鼓励的语气。`,

  [AIPersona.TECH_INTERVIEWER]: `你是一位严格的技术面试官。你的目标是根据岗位 JD 的技术栈，对用户进行高压技术面试。
  
  你应该：
  1. 深入理解岗位所需的技术栈
  2. 提出具有挑战性的技术问题
  3. 评估用户的技术深度和广度
  4. 提供建设性的反馈
  
  保持专业、严谨的态度，问题应该逐步深入。`,

  [AIPersona.HR_BILINGUAL]: `你是一位外企双语 HR。你的目标是考察用户的跨文化沟通能力、行为面试技巧和英文交流水平。
  
  你应该：
  1. 进行行为面试（STAR 方法）
  2. 考察团队合作、沟通、领导力等软技能
  3. 用英文进行部分对话
  4. 评估文化适配度
  
  保持友好、专业的态度，适当使用英文。`,

  [AIPersona.INTERVIEW_COACH]: `你是一位客观的复盘导师。你的目标是帮助用户总结和反思已经进行过的面试。
  
  你应该：
  1. 帮助用户分析面试中的表现
  2. 指出做得好的地方
  3. 指出需要改进的地方
  4. 提供后续准备的建议
  
  保持客观、建设性的态度，帮助用户从面试中学习。`,
};

export function useAIChat() {
  const { config } = useAPIConfig();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 发送聊天消息并获取 AI 回复
   */
  const sendChatMessage = useCallback(
    async (request: ChatRequest): Promise<ChatResponse> => {
      if (!config?.baseUrl || !config?.apiKey) {
        return {
          content: '',
          error: 'API 配置不完整，请先在设置页配置',
        };
      }

      try {
        setIsLoading(true);
        setError(null);

        // 构建系统提示词，注入岗位和简历上下文
        const systemPrompt = `${personaPrompts[request.persona]}

当前岗位信息：
- 公司：${request.job.companyName}
- 岗位：${request.job.jobTitle}
- 地点：${request.job.location}
- 核心技能需求：${request.job.coreSkills.join('、')}

${request.job.jdContent ? `岗位 JD：\n${request.job.jdContent}\n` : ''}

${request.job.resumeContent ? `用户简历：\n${request.job.resumeContent}\n` : ''}

请基于以上信息与用户进行对话。`;

        const response = await axios.post(
          `${config.baseUrl}/v1/chat/completions`,
          {
            model: config.model,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              {
                role: 'user',
                content: request.userMessage,
              },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          },
          {
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('AI 响应为空');
        }

        setError(null);
        return { content };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('AI 聊天失败');
        setError(error);
        console.error('AI chat error:', error);
        return {
          content: '',
          error: error.message,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [config]
  );

  return {
    sendChatMessage,
    isLoading,
    error,
  };
}
