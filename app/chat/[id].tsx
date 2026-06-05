/**
 * AI 辅导聊天室页面
 */

import { ScrollView, Text, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useChat } from '@/hooks/use-chat';
import { useAIChat } from '@/hooks/use-ai-chat';
import { getJobById, clearChatMessages } from '@/lib/db/database';
import { AIPersona, Job } from '@/lib/db/types';

const personaOptions: { value: AIPersona; label: string; description: string }[] = [
  {
    value: AIPersona.RESUME_COACH,
    label: '简历优化导师',
    description: '针对 JD 挖掘简历亮点',
  },
  {
    value: AIPersona.TECH_INTERVIEWER,
    label: '严格的技术面试官',
    description: '针对 JD 的技术栈进行高压提问',
  },
  {
    value: AIPersona.HR_BILINGUAL,
    label: '外企双语 HR',
    description: '考察跨文化沟通、行为面试、英文交流',
  },
  {
    value: AIPersona.INTERVIEW_COACH,
    label: '客观的复盘导师',
    description: '协助用户对刚结束的面试进行总结',
  },
];

export default function ChatScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [job, setJob] = useState<Job | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<AIPersona>(AIPersona.RESUME_COACH);
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isLoadingJob, setIsLoadingJob] = useState(true);
  const [isChangingPersona, setIsChangingPersona] = useState(false);

  const { messages, isLoading, sendMessage, clearMessages } = useChat(id || '', selectedPersona);
  const { sendChatMessage } = useAIChat();
  const scrollViewRef = useRef<ScrollView>(null);

  // 加载岗位数据
  useEffect(() => {
    const loadJob = async () => {
      if (!id) return;
      try {
        setIsLoadingJob(true);
        const data = await getJobById(id);
        if (data) {
          setJob(data);
        }
      } catch (error) {
        Alert.alert('错误', '加载岗位失败');
      } finally {
        setIsLoadingJob(false);
      }
    };

    loadJob();
  }, [id]);

  // 自动滚动到底部
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !job) return;

    const text = messageText.trim();
    setMessageText('');

    try {
      // 1. 保存用户消息
      await sendMessage(text);

      // 2. 调用 AI 接口获取回复
      const response = await sendChatMessage({
        jobId: job.id,
        job,
        persona: selectedPersona,
        userMessage: text,
      });

      if (response.error) {
        Alert.alert('错误', response.error || 'AI 回复失败');
        return;
      }

      // 3. 保存 AI 回复
      await sendMessage(response.content, 'assistant');
    } catch (error) {
      Alert.alert('错误', '发送消息失败');
      setMessageText(text); // 恢复文本
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handlePersonaChange = async (persona: AIPersona) => {
    if (persona === selectedPersona) {
      setShowPersonaPicker(false);
      return;
    }

    Alert.alert(
      '切换身份',
      '切换 AI 身份将清空当前聊天记录，是否继续？',
      [
        { text: '取消', onPress: () => {} },
        {
          text: '确定',
          onPress: async () => {
            try {
              setIsChangingPersona(true);
              // 清空旧身份的聊天记录
              await clearMessages();
              // 切换身份
              setSelectedPersona(persona);
              setShowPersonaPicker(false);
            } catch (error) {
              Alert.alert('错误', '切换身份失败');
            } finally {
              setIsChangingPersona(false);
            }
          },
        },
      ]
    );
  };

  if (isLoadingJob) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  const currentPersona = personaOptions.find((p) => p.value === selectedPersona);

  return (
    <ScreenContainer className="p-4">
      <View className="flex-1 gap-3">
        {/* 头部 */}
        <View className="gap-2">
          <TouchableOpacity onPress={handleBack} className="mb-2">
            <Text className="text-lg text-primary">← 返回</Text>
          </TouchableOpacity>
          <View className="gap-1">
            <Text className="text-2xl font-bold text-foreground">AI 辅导聊天室</Text>
            {job && <Text className="text-sm text-muted">{job.jobTitle} - {job.companyName}</Text>}
          </View>
        </View>

        {/* AI 身份选择 */}
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">AI 身份</Text>
          <TouchableOpacity
            onPress={() => setShowPersonaPicker(!showPersonaPicker)}
            disabled={isChangingPersona}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity: isChangingPersona ? 0.6 : 1,
            }}
          >
            <Text style={{ color: colors.foreground, fontWeight: '500' }}>
              {currentPersona?.label}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
              {currentPersona?.description}
            </Text>
          </TouchableOpacity>

          {showPersonaPicker && (
            <View className="gap-2">
              {personaOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => handlePersonaChange(option.value)}
                  disabled={isChangingPersona}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor:
                      selectedPersona === option.value ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor:
                      selectedPersona === option.value ? colors.primary : colors.border,
                    opacity: isChangingPersona ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      color:
                        selectedPersona === option.value ? colors.background : colors.foreground,
                      fontWeight: '500',
                    }}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={{
                      color:
                        selectedPersona === option.value ? colors.background : colors.muted,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {option.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 聊天消息列表 */}
        <View style={{ flex: 1, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={{ gap: 8, padding: 12 }}
            style={{ backgroundColor: colors.surface }}
          >
            {messages.length === 0 ? (
              <View className="items-center justify-center py-8">
                <Text style={{ color: colors.muted }}>开始与 AI 对话吧</Text>
              </View>
            ) : (
              messages.map((msg) => (
                <View
                  key={msg.id}
                  style={{
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    gap: 8,
                  }}
                >
                  <View
                    style={{
                      maxWidth: '80%',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 8,
                      backgroundColor:
                        msg.role === 'user' ? colors.primary : colors.background,
                    }}
                  >
                    <Text
                      style={{
                        color: msg.role === 'user' ? colors.background : colors.foreground,
                        lineHeight: 18,
                      }}
                    >
                      {msg.content}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* 消息输入框 */}
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <TextInput
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: colors.foreground,
              backgroundColor: colors.surface,
              maxHeight: 100,
            }}
            placeholder="输入您的问题..."
            placeholderTextColor={colors.muted}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            editable={!isLoading && !isChangingPersona}
          />
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={isLoading || !messageText.trim() || isChangingPersona}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: isLoading || !messageText.trim() || isChangingPersona ? colors.muted : colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.background, fontWeight: '600' }}>
              {isLoading ? '...' : '发送'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
