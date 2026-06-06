/**
 * 设置页面 - API 配置
 */

import { ScrollView, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useAPIConfig } from '@/hooks/use-api-config';
import { useColors } from '@/hooks/use-colors';
import { testAPIConnection, APITestResult } from '@/hooks/use-ai-parser';

const PRESET_MODELS = ['GPT-5.5', 'Claude Opus 4.8', 'Gemini 2.0'];

export default function SettingsScreen() {
  const colors = useColors();
  const { config, isLoading, updateConfig } = useAPIConfig();

  const [baseUrl, setBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('GPT-5.5');
  const [customModel, setCustomModel] = useState('');
  const [showCustomModel, setShowCustomModel] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<APITestResult | null>(null);

  // 初始化表单
  useEffect(() => {
    if (config) {
      setBaseUrl(config.baseUrl);
      setApiKey(config.apiKey);
      setSelectedModel(config.model);
      setShowCustomModel(!PRESET_MODELS.includes(config.model));
      if (!PRESET_MODELS.includes(config.model)) {
        setCustomModel(config.model);
      }
    }
  }, [config]);

  const handleSave = async () => {
    // 验证输入
    if (!baseUrl.trim()) {
      Alert.alert('错误', '请输入 Base URL');
      return;
    }
    if (!apiKey.trim()) {
      Alert.alert('错误', '请输入 API Key');
      return;
    }

    const model = showCustomModel ? customModel : selectedModel;
    if (!model.trim()) {
      Alert.alert('错误', '请选择或输入模型名称');
      return;
    }

    try {
      setIsSaving(true);
      await updateConfig({
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim(),
      });
      Alert.alert('成功', 'API 配置已保存');
    } catch (error) {
      Alert.alert('错误', '保存配置失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    const model = showCustomModel ? customModel : selectedModel;
    setTestResult(null);
    setIsTesting(true);
    try {
      const result = await testAPIConnection({
        baseUrl: baseUrl.trim(),
        apiKey: apiKey.trim(),
        model: model.trim(),
      });
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '测试失败，请重试',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    setBaseUrl('');
    setApiKey('');
    setSelectedModel('GPT-5.5');
    setCustomModel('');
    setShowCustomModel(false);
    setTestResult(null);
  };

  if (isLoading) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text className="text-foreground">加载中...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-4">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View className="gap-6 pb-8">
          {/* 标题 */}
          <View className="gap-2">
            <Text className="text-3xl font-bold text-foreground">API 配置</Text>
            <Text className="text-sm text-muted">配置 AI 服务的底层参数</Text>
          </View>

          {/* Base URL 输入框 */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Base URL</Text>
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
              placeholder="https://api.example.com"
              placeholderTextColor={colors.muted}
              value={baseUrl}
              onChangeText={setBaseUrl}
              editable={!isSaving}
            />
          </View>

          {/* API Key 输入框 */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">API Key</Text>
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
              placeholder="sk-..."
              placeholderTextColor={colors.muted}
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry={true}
              editable={!isSaving}
            />
          </View>

          {/* 模型选择 */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">模型选择</Text>

            {/* 预设模型按钮 */}
            <View className="gap-2">
              {PRESET_MODELS.map((model) => (
                <TouchableOpacity
                  key={model}
                  onPress={() => {
                    setSelectedModel(model);
                    setShowCustomModel(false);
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor:
                      !showCustomModel && selectedModel === model
                        ? colors.primary
                        : colors.border,
                    backgroundColor:
                      !showCustomModel && selectedModel === model
                        ? colors.surface
                        : colors.background,
                  }}
                  disabled={isSaving}
                >
                  <Text
                    style={{
                      color:
                        !showCustomModel && selectedModel === model
                          ? colors.primary
                          : colors.foreground,
                      fontWeight: '500',
                    }}
                  >
                    {model}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 自定义模型输入 */}
            <TouchableOpacity
              onPress={() => setShowCustomModel(!showCustomModel)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: showCustomModel ? colors.primary : colors.border,
                backgroundColor: showCustomModel ? colors.surface : colors.background,
              }}
              disabled={isSaving}
            >
              <Text
                style={{
                  color: showCustomModel ? colors.primary : colors.foreground,
                  fontWeight: '500',
                }}
              >
                自定义模型
              </Text>
            </TouchableOpacity>

            {showCustomModel && (
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: colors.foreground,
                  backgroundColor: colors.surface,
                  marginTop: 8,
                }}
                placeholder="输入自定义模型名称"
                placeholderTextColor={colors.muted}
                value={customModel}
                onChangeText={setCustomModel}
                editable={!isSaving}
              />
            )}
          </View>

          {/* 按钮组 */}
          <View className="gap-3 pt-4">
            <TouchableOpacity
              onPress={handleTest}
              disabled={isSaving || isTesting}
              style={{
                paddingVertical: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.primary,
                backgroundColor: colors.surface,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                opacity: isSaving || isTesting ? 0.6 : 1,
              }}
            >
              {isTesting && <ActivityIndicator size="small" color={colors.primary} />}
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                {isTesting ? '测试中...' : '测试连接'}
              </Text>
            </TouchableOpacity>

            {testResult && (
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  borderLeftWidth: 4,
                  borderLeftColor: testResult.success ? colors.success : colors.error,
                }}
              >
                <Text
                  style={{
                    color: testResult.success ? colors.success : colors.error,
                    fontWeight: '600',
                    marginBottom: 4,
                  }}
                >
                  {testResult.success ? '✓ 测试通过' : '✗ 测试失败'}
                </Text>
                <Text style={{ color: colors.foreground, fontSize: 12, lineHeight: 18 }}>
                  {testResult.message}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={{
                paddingVertical: 12,
                borderRadius: 8,
                backgroundColor: isSaving ? colors.muted : colors.primary,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.background, fontWeight: '600' }}>
                {isSaving ? '保存中...' : '保存配置'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleReset}
              disabled={isSaving}
              style={{
                paddingVertical: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: '600' }}>重置</Text>
            </TouchableOpacity>
          </View>

          {/* 帮助提示 */}
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
              💡 提示：配置的 API 参数将保存在本地，用于后续的 AI 解析和聊天功能。
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
