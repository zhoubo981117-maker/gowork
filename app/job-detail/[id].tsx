/**
 * 岗位详情页面（简化版）
 * 支持修改岗位标题、投递状态，查看简历与岗位 JD 文件
 */

import { ScrollView, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { getJobById, updateJob } from '@/lib/db/database';
import { Job, InterviewStatus } from '@/lib/db/types';
import { openDocument } from '@/lib/open-document';

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

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  useEffect(() => {
    const loadJob = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await getJobById(id);
        if (data) {
          setJob(data);
          setTitleDraft(data.jobTitle);
        } else {
          Alert.alert('错误', '岗位不存在');
          router.back();
        }
      } catch {
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
    } catch {
      Alert.alert('错误', '更新状态失败');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveTitle = async () => {
    if (!job) return;
    const newTitle = titleDraft.trim();
    if (!newTitle) {
      Alert.alert('提示', '岗位标题不能为空');
      return;
    }
    try {
      setIsUpdating(true);
      const updated = await updateJob(job.id, { jobTitle: newTitle });
      setJob(updated);
      setIsEditingTitle(false);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      Alert.alert('错误', `保存标题失败\n\n${detail}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewJD = () => {
    if (!job) return;
    openDocument({ fileUri: job.jdFileUri, content: job.jdContent, displayName: `岗位JD-${job.jobTitle}` });
  };

  const handleViewResume = () => {
    if (!job) return;
    openDocument({ fileUri: job.resumeFileUri, content: job.resumeContent, displayName: `简历-${job.jobTitle}` });
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
  const hasJD = !!(job.jdFileUri || job.jdContent);
  const hasResume = !!(job.resumeFileUri || job.resumeContent);

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="gap-6 pb-8">
          {/* 返回按钮 */}
          <TouchableOpacity onPress={() => router.back()} className="mb-2">
            <Text className="text-lg text-primary">← 返回</Text>
          </TouchableOpacity>

          {/* 岗位标题（可编辑） */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">岗位标题</Text>
            {isEditingTitle ? (
              <View className="gap-2">
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    color: colors.foreground,
                    backgroundColor: colors.surface,
                    fontSize: 18,
                  }}
                  value={titleDraft}
                  onChangeText={setTitleDraft}
                  editable={!isUpdating}
                  autoFocus
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={handleSaveTitle}
                    disabled={isUpdating}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center' }}
                  >
                    <Text style={{ color: colors.background, fontWeight: '600' }}>保存</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setTitleDraft(job.jobTitle);
                      setIsEditingTitle(false);
                    }}
                    disabled={isUpdating}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}
                  >
                    <Text style={{ color: colors.foreground, fontWeight: '600' }}>取消</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: colors.foreground, flex: 1 }}>
                  {job.jobTitle || '未命名岗位'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setTitleDraft(job.jobTitle);
                    setIsEditingTitle(true);
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: colors.primary }}
                >
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>编辑</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 状态切换 */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">投递状态</Text>
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
                      backgroundColor: job.status === option.value ? colors.primary : colors.surface,
                      borderWidth: 1,
                      borderColor: job.status === option.value ? colors.primary : colors.border,
                    }}
                    disabled={isUpdating}
                  >
                    <Text
                      style={{
                        color: job.status === option.value ? colors.background : colors.foreground,
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

          {/* 文档查看入口 */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">归档文档</Text>
            {!hasJD && !hasResume ? (
              <Text style={{ color: colors.muted, fontSize: 13 }}>未上传任何文件</Text>
            ) : (
              <View className="gap-2">
                {hasJD && (
                  <TouchableOpacity
                    onPress={handleViewJD}
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
                {hasResume && (
                  <TouchableOpacity
                    onPress={handleViewResume}
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
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
