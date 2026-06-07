/**
 * AI 解析服务 Hook
 */

import { useState, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import { useAPIConfig } from './use-api-config';
import {
  buildUserContent,
  buildTextOnlyContent,
  hasImageParts,
  DocInput,
} from '@/lib/ai-context';

export interface ParseResult {
  companyName: string;
  jobTitle: string;
  location: string;
  coreSkills: string[];
  matchAnalysis?: string;
}

/** 文件元信息，用于判断是否以图片（视觉）方式发送 */
export interface FileMeta {
  mimeType?: string | null;
  fileUri?: string | null;
}

interface AIResponse {
  companyName?: string;
  jobTitle?: string;
  location?: string;
  coreSkills?: string[];
  matchAnalysis?: string;
  [key: string]: any;
}

export interface APITestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

/**
 * 测试 API 连接与模型可用性
 * 使用传入的配置（而非已保存配置），便于在保存前先验证
 */
export async function testAPIConnection(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
}): Promise<APITestResult> {
  const { baseUrl, apiKey, model } = params;

  if (!baseUrl?.trim()) {
    return { success: false, message: '请先填写 Base URL' };
  }
  if (!apiKey?.trim()) {
    return { success: false, message: '请先填写 API Key' };
  }
  if (!model?.trim()) {
    return { success: false, message: '请先选择或填写模型名称' };
  }

  // 规范化 baseUrl，避免出现重复的斜杠
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, '');
  const startedAt = Date.now();

  try {
    const response = await axios.post(
      `${normalizedBaseUrl}/v1/chat/completions`,
      {
        model: model.trim(),
        messages: [
          { role: 'user', content: '请回复"ok"两个字以确认连接成功。' },
        ],
        max_tokens: 10,
        temperature: 0,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );

    const latencyMs = Date.now() - startedAt;
    const content = response.data?.choices?.[0]?.message?.content;

    if (typeof content === 'string') {
      return {
        success: true,
        message: `连接成功，模型 "${model.trim()}" 可正常调用（耗时 ${latencyMs}ms）`,
        latencyMs,
      };
    }

    return {
      success: false,
      message: '已连接，但返回内容为空，请检查模型名称是否正确',
      latencyMs,
    };
  } catch (err) {
    const error = err as AxiosError<any>;

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      const detail =
        (data && (data.error?.message || data.message)) ||
        (typeof data === 'string' ? data : '');

      let hint = '';
      if (status === 401 || status === 403) {
        hint = 'API Key 无效或无权限';
      } else if (status === 404) {
        hint = 'Base URL 或模型路径不正确';
      } else if (status === 429) {
        hint = '请求过于频繁或额度不足';
      } else if (status >= 500) {
        hint = '服务端错误，请稍后再试';
      }

      return {
        success: false,
        message: `请求失败 (HTTP ${status})${hint ? `：${hint}` : ''}${detail ? `\n${detail}` : ''}`,
      };
    }

    if (error.code === 'ECONNABORTED') {
      return { success: false, message: '请求超时，请检查网络或 Base URL 是否可访问' };
    }

    return {
      success: false,
      message: `无法连接到服务：${error.message || '未知错误'}，请检查 Base URL 与网络`,
    };
  }
}

export function useAIParser() {
  const { config } = useAPIConfig();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 调用 chat/completions。优先以多模态（含图片）方式发送；
   * 若失败（如模型不支持视觉），自动降级为纯文本重试一次，避免硬报错。
   */
  const requestCompletion = useCallback(
    async (params: {
      systemPrompt: string;
      instruction: string;
      docs: DocInput[];
      temperature: number;
    }): Promise<string> => {
      const { systemPrompt, instruction, docs, temperature } = params;

      const post = async (userContent: string | object[]) => {
        const response = await axios.post(
          `${config!.baseUrl}/v1/chat/completions`,
          {
            model: config!.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent },
            ],
            temperature,
          },
          {
            headers: {
              Authorization: `Bearer ${config!.apiKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const content = response.data?.choices?.[0]?.message?.content;
        if (!content) throw new Error('AI 响应为空');
        return content as string;
      };

      const visionContent = buildUserContent(instruction, docs);
      try {
        return await post(visionContent as any);
      } catch (err) {
        // 含图片时降级为纯文本重试一次
        if (hasImageParts(visionContent)) {
          console.warn('[AIParser] vision request failed, retrying text-only:', err);
          return await post(buildTextOnlyContent(instruction, docs));
        }
        throw err;
      }
    },
    [config]
  );

  /**
   * 调用 AI 接口解析 JD
   */
  const parseJD = useCallback(
    async (jdContent: string, jdMeta?: FileMeta): Promise<ParseResult | null> => {
      if (!config?.baseUrl || !config?.apiKey) {
        setError(new Error('API 配置不完整，请先在设置页配置'));
        return null;
      }

      try {
        setIsLoading(true);
        setError(null);

        const content = await requestCompletion({
          systemPrompt: `你是一个专业的招聘信息解析专家。请从给定的岗位 JD（可能是文本或图片）中提取以下信息，并以 JSON 格式返回：
                {
                  "companyName": "公司名称",
                  "jobTitle": "岗位名称",
                  "location": "工作地点",
                  "coreSkills": ["技能1", "技能2", "技能3"]
                }

                确保返回的是有效的 JSON 格式。`,
          instruction: '请解析以下岗位 JD：',
          docs: [
            { label: '岗位 JD', content: jdContent, mimeType: jdMeta?.mimeType, fileUri: jdMeta?.fileUri },
          ],
          temperature: 0.3,
        });

        // 尝试从响应中提取 JSON
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('无法从 AI 响应中提取 JSON');
        }

        const parsed: AIResponse = JSON.parse(jsonMatch[0]);

        const result: ParseResult = {
          companyName: parsed.companyName || '未知公司',
          jobTitle: parsed.jobTitle || '未知岗位',
          location: parsed.location || '未知地点',
          coreSkills: Array.isArray(parsed.coreSkills) ? parsed.coreSkills : [],
        };

        setError(null);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('AI 解析失败');
        setError(error);
        console.error('AI parsing error:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [config, requestCompletion]
  );

  /**
   * 生成人岗匹配度分析
   */
  const generateMatchAnalysis = useCallback(
    async (
      jdContent: string,
      resumeContent: string,
      meta?: { jd?: FileMeta; resume?: FileMeta }
    ): Promise<string | null> => {
      if (!config?.baseUrl || !config?.apiKey) {
        setError(new Error('API 配置不完整，请先在设置页配置'));
        return null;
      }

      try {
        setIsLoading(true);
        setError(null);

        const analysis = await requestCompletion({
          systemPrompt: `你是一个专业的职业顾问。请根据用户的简历和岗位 JD（可能是文本或图片）生成一份详细的人岗匹配度分析报告。

                分析应包括：
                1. 整体匹配度评分（0-100）
                2. 用户的主要优势
                3. 与岗位要求的差距
                4. 建议的准备方向

                使用专业、鼓励的语气，帮助用户了解自己的竞争力。`,
          instruction: '请分析我的简历与这个岗位的匹配度。',
          docs: [
            { label: '岗位 JD', content: jdContent, mimeType: meta?.jd?.mimeType, fileUri: meta?.jd?.fileUri },
            { label: '我的简历', content: resumeContent, mimeType: meta?.resume?.mimeType, fileUri: meta?.resume?.fileUri },
          ],
          temperature: 0.5,
        });

        setError(null);
        return analysis;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('生成匹配度分析失败');
        setError(error);
        console.error('Match analysis error:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [config, requestCompletion]
  );

  return {
    parseJD,
    generateMatchAnalysis,
    isLoading,
    error,
  };
}
