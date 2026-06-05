/**
 * 简历/JD 导入页面
 */

import { ScrollView, Text, View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useFilePicker, PickedFile } from '@/hooks/use-file-picker';
import { useAIParser } from '@/hooks/use-ai-parser';
import { useJobs } from '@/hooks/use-jobs';
import { InterviewStatus } from '@/lib/db/types';

export default function ImportScreen() {
  const router = useRouter();
  const colors = useColors();
  const { pickFile, isLoading: isPickingFile } = useFilePicker();
  const { parseJD, generateMatchAnalysis, isLoading: isParsingAI } = useAIParser();
  const { addJob } = useJobs();

  const [resumeFile, setResumeFile] = useState<PickedFile | null>(null);
  const [jdFile, setJDFile] = useState<PickedFile | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handlePickResume = async () => {
    const file = await pickFile();
    if (file) {
      setResumeFile(file);
    }
  };

  const handlePickJD = async () => {
    const file = await pickFile();
    if (file) {
      setJDFile(file);
    }
  };

  const handleAnalyzeAndSave = async () => {
    if (!resumeFile || !jdFile) {
      Alert.alert('错误', '请先上传简历和岗位 JD');
      return;
    }

    try {
      setIsAnalyzing(true);

      // 1. 解析 JD 获取基本信息
      Alert.alert('提示', '正在分析岗位 JD...');
      const parseResult = await parseJD(jdFile.base64 || jdFile.uri);

      if (!parseResult) {
        Alert.alert('错误', '岗位解析失败，请检查 API 配置');
        return;
      }

      // 2. 生成人岗匹配度分析
      Alert.alert('提示', '正在生成匹配度分析...');
      const matchAnalysis = await generateMatchAnalysis(
        jdFile.base64 || jdFile.uri,
        resumeFile.base64 || resumeFile.uri
      );

      // 3. 保存到数据库
      const newJob = await addJob({
        companyName: parseResult.companyName,
        jobTitle: parseResult.jobTitle,
        location: parseResult.location,
        status: InterviewStatus.BEFORE_APPLY,
        jdContent: jdFile.base64 || jdFile.uri,
        jdFileUri: jdFile.uri,
        resumeContent: resumeFile.base64 || resumeFile.uri,
        resumeFileUri: resumeFile.uri,
        coreSkills: parseResult.coreSkills,
        matchAnalysis: matchAnalysis || '匹配度分析生成失败',
      });

      Alert.alert('成功', '岗位已添加，即将返回主页', [
        {
          text: '确定',
          onPress: () => {
            router.push('/(tabs)');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('错误', '保存岗位失败，请重试');
      console.error('Error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setResumeFile(null);
    setJDFile(null);
  };

  const isLoading = isPickingFile || isParsingAI || isAnalyzing;

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="gap-6 pb-8">
          {/* 标题 */}
          <View className="gap-2">
            <TouchableOpacity onPress={handleBack} className="mb-2">
              <Text className="text-lg text-primary">← 返回</Text>
            </TouchableOpacity>
            <Text className="text-3xl font-bold text-foreground">导入岗位</Text>
            <Text className="text-sm text-muted">上传简历和岗位 JD，AI 将为您分析匹配度</Text>
          </View>

          {/* 简历上传 */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">简历</Text>
            {resumeFile ? (
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 4 }}>
                      ✓ {resumeFile.name}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {resumeFile.size ? `${(resumeFile.size / 1024).toFixed(1)} KB` : '已上传'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handlePickResume}
                    disabled={isLoading}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      backgroundColor: colors.primary,
                    }}
                  >
                    <Text style={{ color: colors.background, fontSize: 12, fontWeight: '500' }}>
                      更换
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickResume}
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
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📄</Text>
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>选择简历文件</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                  支持 PDF、Word、图片
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* JD 上传 */}
          <View className="gap-3">
            <Text className="text-lg font-semibold text-foreground">岗位 JD</Text>
            {jdFile ? (
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 4 }}>
                      ✓ {jdFile.name}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      {jdFile.size ? `${(jdFile.size / 1024).toFixed(1)} KB` : '已上传'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handlePickJD}
                    disabled={isLoading}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      backgroundColor: colors.primary,
                    }}
                  >
                    <Text style={{ color: colors.background, fontSize: 12, fontWeight: '500' }}>
                      更换
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickJD}
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
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📋</Text>
                <Text style={{ color: colors.foreground, fontWeight: '600' }}>选择 JD 文件</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                  支持 PDF、Word、图片
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 操作按钮 */}
          <View className="gap-3 pt-4">
            <TouchableOpacity
              onPress={handleAnalyzeAndSave}
              disabled={!resumeFile || !jdFile || isLoading}
              style={{
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: !resumeFile || !jdFile || isLoading ? colors.muted : colors.primary,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {isLoading && <ActivityIndicator size="small" color={colors.background} />}
              <Text style={{ color: colors.background, fontWeight: '600' }}>
                {isLoading ? '分析中...' : '分析并保存'}
              </Text>
            </TouchableOpacity>

            {(resumeFile || jdFile) && (
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
              💡 提示：文件将保存在本地，AI 将自动提取关键信息并分析人岗匹配度。请确保已在设置页配置 API。
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
