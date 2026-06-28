/**
 * 投递记录 —— CareerPulse 主页（按设计稿重构）
 * 顶栏（头像 + 品牌 + 通知）、搜索框、状态筛选药丸、岗位卡片列表、新增浮动按钮。
 */

import { Text, View, TouchableOpacity, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScreenContainer } from '@/components/screen-container';
import { JobCard } from '@/components/job-card';
import { useJobs } from '@/hooks/use-jobs';
import { useColors } from '@/hooks/use-colors';
import { InterviewStatus } from '@/lib/db/types';

// 设计稿的 4 个筛选分组
type FilterKey = 'all' | 'interviewing' | 'hired' | 'rejected';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'interviewing', label: '面试中' },
  { key: 'hired', label: '已录用' },
  { key: 'rejected', label: '不合适' },
];

const INTERVIEWING_STATUSES = [
  InterviewStatus.BEFORE_APPLY,
  InterviewStatus.APPLIED,
  InterviewStatus.FIRST_ROUND,
  InterviewStatus.SECOND_ROUND,
];

function matchesFilter(status: InterviewStatus, key: FilterKey): boolean {
  switch (key) {
    case 'all':
      return true;
    case 'interviewing':
      return INTERVIEWING_STATUSES.includes(status);
    case 'hired':
      return status === InterviewStatus.OFFER_RECEIVED;
    case 'rejected':
      return status === InterviewStatus.REJECTED;
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { jobs, isLoading, loadJobs } = useJobs();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [loadJobs])
  );

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((job) => {
      if (!matchesFilter(job.status, filter)) return false;
      if (!q) return true;
      return (
        job.companyName.toLowerCase().includes(q) ||
        job.jobTitle.toLowerCase().includes(q) ||
        job.location.toLowerCase().includes(q)
      );
    });
  }, [jobs, filter, search]);

  const handleAddJob = () => router.push('/import');
  const handleJobPress = (jobId: string) => router.push(`/job-detail/${jobId}`);

  if (isLoading && jobs.length === 0) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-foreground">加载投递记录...</Text>
      </ScreenContainer>
    );
  }

  const ListHeader = (
    <View style={{ gap: 16, paddingBottom: 4 }}>
      {/* 页面标题 */}
      <Text style={{ fontSize: 28, fontWeight: '800', color: colors.foreground }}>投递记录</Text>

      {/* 搜索框 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 14,
          height: 48,
          borderRadius: 12,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <MaterialIcons name="search" size={20} color={colors.muted} />
        <TextInput
          style={{ flex: 1, color: colors.foreground, fontSize: 15 }}
          placeholder="搜索公司、职位或状态..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
        />
        <MaterialIcons name="tune" size={20} color={colors.muted} />
      </View>

      {/* 筛选药丸 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {FILTERS.map(({ key, label }) => {
          const selected = filter === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setFilter(key)}
              activeOpacity={0.8}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 9,
                borderRadius: 9999,
                backgroundColor: selected ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: selected ? colors.primary : colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: selected ? '#FFFFFF' : colors.foreground,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      {/* 顶栏 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="person" size={24} color={colors.muted} />
        </View>
        <Text style={{ fontSize: 19, fontWeight: '800', color: colors.primary }}>CareerPulse</Text>
        <MaterialIcons name="notifications-none" size={26} color={colors.foreground} />
      </View>

      {/* 列表 */}
      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobCard job={item} onPress={() => handleJobPress(item.id)} />}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ padding: 20, paddingBottom: 96 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 64, gap: 8 }}>
            <MaterialIcons name="work-off" size={48} color={colors.muted} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>暂无投递记录</Text>
            <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center' }}>
              {jobs.length === 0 ? '点击右下角按钮添加你的第一条投递' : '没有找到匹配的记录'}
            </Text>
          </View>
        }
      />

      {/* 新增浮动按钮 */}
      <TouchableOpacity
        onPress={handleAddJob}
        activeOpacity={0.9}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <MaterialIcons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
    </ScreenContainer>
  );
}
