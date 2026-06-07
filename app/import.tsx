/**
 * 岗位归档页面（简化版）
 * 仅上传/存档简历与岗位 JD，填写岗位标题，不做任何 AI 分析
 */

import { ScrollView, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFilePicker, PickedFile } from '@/hooks/use-file-picker';
import { useJobs } from '@/hooks/use-jobs';
import { InterviewStatus } from '@/lib/db/types';

function fileNameToTitle(name: string) {
  return name.replace(/\.[^.]+$/, '').trim();
}

export default function ImportScreen() {
  const router = useRouter();
  const colors = useColors();
  const { pickFile, isLoading: isPickingFile } = useFilePicker();
  const { addJob } = useJobs();

  const [resumeFile, setResumeFile] = useState<PickedFile | null>(null);
  const [jdFile, setJDFile] = useState<PickedFile | null>(null);
  const [title, setTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleBack = () => router.back();

  const handlePickResume = async () => {
    const file = await pickFile();
    if (file) {
      setResumeFile(file);
      if (!title.trim()) setTitle(fileNameToTitle(file.name));
    }
  };

  const handlePickJD = async () => {
    const file = await pickFile();
    if (file) {
      setJDFile(file);
      if (!title.trim()) setTitle(fileNameToTitle(file.name));
    }
  };

  const handleSave = async () => {
    if (!title.trim() && !resumeFile && !jdFile) {
      Alert.alert('提示', '请至少填写岗位标题，或上传简历 / JD');
      return;
    }

    try {
      setIsSaving(true);
      await addJob({
        companyName: '',
        jobTitle: title.trim() || '未命名岗位',
        location: '',
        status: InterviewStatus.BEFORE_APPLY,
        jdContent: jdFile?.base64 || jdFile?.uri || '',
        jdFileUri: jdFile?.uri || '',
        resumeContent: resumeFile?.base64 || resumeFile?.uri || '',
        resumeFileUri: resumeFile?.uri || '',
        coreSkills: [],
        matchAnalysis: '',
      });

      Alert.alert('成功', '岗位已保存', [
        { text: '确定', onPress: () => router.push('/(tabs)') },
      ]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      Alert.alert('错误', `保存失败，请重试\n\n${detail}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setResumeFile(null);
    setJDFile(null);
    setTitle('');
  };

  const isLoading = isPickingFile || isSaving;

  const renderFileRow = (
    file: PickedFile | null,
    onPick: () => void,
    icon: string,
    placeholder: string
  ) =>
    file ? (
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 4 }}>
              ✓ {file.name}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              {file.size ? `${(file.size / 1024).toFixed(1)} KB` : '已上传'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onPick}
            disabled={isLoading}
            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.primary }}
          >
            <Text style={{ color: colors.background, fontSize: 12, fontWeight: '500' }}>更换</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : (
      <TouchableOpacity
        onPress={onPick}
        disabled={isLoading}
        style={{
          paddingVertical: 32,
          borderRadius: 12,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface,
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        <Text style={{ fontSize: 32, marginBottom: 8 }}>{icon}</Text>
        <Text style={{ color: colors.foreground, fontWeight: '600' }}>{placeholder}</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>支持 PDF、Word、图片</Text>
      </TouchableOpacity>
    );

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="gap-6 pb-8">
          {/* 标题 */}
          <View className="gap-2">
            <TouchableOpacity onPress={handleBack} className="mb-2">
              <Text className="text-lg text-primary">← 返回</Text>
            </TouchableOpacity>
            <Text className="text-3xl font-bold text-foreground">新增岗位</Text>
            <Text className="text-sm text-muted">填写岗位标题，并存档简历与岗位 JD</Text>
          </View>

          {/* 岗位标题 */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">岗位标题</Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: colors.foreground,
                backgroundColor: colors.surface,
              }}
              placeholder="例如：字节跳动 - 前端工程师"
              placeholderTextColor={colors.muted}
              value={title}
              onChangeText={setTitle}
              editable={!isLoading}
            />
          </View>

          {/* 简历上传 */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">简历</Text>
            {renderFileRow(resumeFile, handlePickResume, '📄', '选择简历文件')}
          </View>

          {/* JD 上传 */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">岗位 JD</Text>
            {renderFileRow(jdFile, handlePickJD, '📋', '选择 JD 文件')}
          </View>

          {/* 操作按钮 */}
          <View className="gap-3 pt-4">
            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading}
              style={{
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: isLoading ? colors.muted : colors.primary,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {isSaving && <ActivityIndicator size="small" color={colors.background} />}
              <Text style={{ color: colors.background, fontWeight: '600' }}>
                {isSaving ? '保存中...' : '保存'}
              </Text>
            </TouchableOpacity>

            {(resumeFile || jdFile || title) && (
              <TouchableOpacity
                onPress={handleClear}
                disabled={isLoading}
                style={{
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>清空</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 提示 */}
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 8,
              backgroundColor: colors.surface,
              borderLeftWidth: 4,
              borderLeftColor: colors.warning,
            }}
          >
            <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>
              💡 文件将保存在本地，可在岗位详情中随时查看。保存后可修改岗位标题与投递状态。
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
