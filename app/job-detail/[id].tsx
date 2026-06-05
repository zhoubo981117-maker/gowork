/**
 * 岗位详情页面
 */

import { ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { getJobById, updateJob } from '@/lib/db/database';
import { Job, InterviewStatus } from '@/lib/db/types';

const statusOptions = [
  { value: InterviewStatus.BEFORE_APPLY, label: '投递前' },
  { value: InterviewStatus.APPLIED, label: '投递中' },
  { value: InterviewStatus.FIRST_ROUND, label: '一面' },
  { value: InterviewStatus.SECOND_ROUND, label: '二面' },
  { value: InterviewStatus.OFFER_RECEIVED, label: '已拿 offer' },
  { value: InterviewStatus.REJECTED, label: '面试未通过' },
];

export default function JobDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  // 加载岗位数据
  useEffect(() => {
    const loadJob = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await getJobById(id);
        if (data) {
          setJob(data);
        } else {
          Alert.alert('错误', '岗位不存在');
          router.back();
        }
      } catch (error) {
        Alert.alert('错误', '加载岗位失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadJob();
  }, [id]);

  const handleStatusChange = async (newStatus: InterviewStatus) => {
    if (!job) return;

    try {
      setIsUpdating(true);
      const updated = await updateJob(job.id, { status: newStatus });
      setJob(updated);
      setShowStatusPicker(false);
    } catch (error) {
      Alert.alert('错误', '更新状态失败');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleViewChat = () => {
    if (job) {
      router.push(`/chat/${job.id}`);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (!job) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-foreground">岗位不存在</Text>
      </ScreenContainer>
    );
  }

  const currentStatus = statusOptions.find((s) => s.value === job.status);

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="gap-6 pb-8">
          {/* 返回按钮 */}
          <TouchableOpacity onPress={handleBack} className="mb-2">
            <Text className="text-lg text-primary">← 返回</Text>
          </TouchableOpacity>

          {/* 基本信息 */}
          <View className="gap-3">
            <Text className="text-3xl font-bold text-foreground">{job.jobTitle}</Text>
            <Text className="text-lg text-muted">{job.companyName}</Text>
            <Text className="text-sm text-muted">📍 {job.location}</Text>
          </View>

          {/* 状态切换 */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">面试状态</Text>
            <TouchableOpacity
              onPress={() => setShowStatusPicker(!showStatusPicker)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
              disabled={isUpdating}
            >
              <Text style={{ color: colors.foreground, fontWeight: '500' }}>
                {currentStatus?.label || '未知状态'}
              </Text>
            </TouchableOpacity>

            {showStatusPicker && (
              <View className="gap-2">
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => handleStatusChange(option.value)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor:
                        job.status === option.value ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor:
                        job.status === option.value ? colors.primary : colors.border,
                    }}
                    disabled={isUpdating}
                  >
                    <Text
                      style={{
                        color:
                          job.status === option.value ? colors.background : colors.foreground,
                        fontWeight: '500',
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* 核心技能 */}
          {job.coreSkills.length > 0 && (
            <View className="gap-3">
              <Text className="text-sm font-semibold text-foreground">核心技能需求</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {job.coreSkills.map((skill, index) => (
                  <View
                    key={index}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 6,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: colors.foreground }}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 人岗匹配度分析 */}
          {job.matchAnalysis && (
            <View className="gap-3">
              <Text className="text-sm font-semibold text-foreground">人岗匹配度分析</Text>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: colors.foreground, lineHeight: 20 }}>
                  {job.matchAnalysis}
                </Text>
              </View>
            </View>
          )}

          {/* AI 辅导聊天室按钮 */}
          <TouchableOpacity
            onPress={handleViewChat}
            style={{
              paddingVertical: 12,
              borderRadius: 8,
              backgroundColor: colors.primary,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.background, fontWeight: '600' }}>
              进入 AI 辅导聊天室
            </Text>
          </TouchableOpacity>

          {/* 文档查看入口 */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">原始文档</Text>
            <View className="gap-2">
              {job.jdFileUri && (
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Text style={{ color: colors.foreground }}>📋 查看岗位 JD</Text>
                </TouchableOpacity>
              )}
              {job.resumeFileUri && (
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  }}
                >
                  <Text style={{ color: colors.foreground }}>📄 查看简历</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
