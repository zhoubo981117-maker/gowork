/**
 * 消息 —— AI 面试教练会话入口
 * 按岗位列出可发起的 AI 教练对话（简历优化 / 技术面试 / 复盘等），点击进入聊天。
 */

import { Text, View, FlatList, TouchableOpacity } from 'react-native';
import { useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScreenContainer } from '@/components/screen-container';
import { useJobs } from '@/hooks/use-jobs';
import { useColors } from '@/hooks/use-colors';

export default function MessagesScreen() {
  const router = useRouter();
  const colors = useColors();
  const { jobs, loadJobs } = useJobs();

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [loadJobs])
  );

  return (
    <ScreenContainer>
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.foreground }}>消息</Text>
        <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
          与 AI 面试教练就具体岗位展开对话
        </Text>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 96, gap: 12 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 64, gap: 8 }}>
            <MaterialIcons name="chat-bubble-outline" size={48} color={colors.muted} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>暂无对话</Text>
            <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>
              先添加一条投递记录，即可向 AI 教练咨询
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/chat/${item.id}`)}
            activeOpacity={0.85}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 14,
              borderRadius: 14,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="smart-toy" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>
                {item.jobTitle}
              </Text>
              <Text style={{ fontSize: 13, color: colors.muted }} numberOfLines={1}>
                {item.companyName} · AI 面试教练
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
          </TouchableOpacity>
        )}
      />
    </ScreenContainer>
  );
}
