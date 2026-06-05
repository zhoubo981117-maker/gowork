/**
 * 主页面 - 岗位管理大厅
 */

import { ScrollView, Text, View, TouchableOpacity, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { JobCard } from '@/components/job-card';
import { useJobs } from '@/hooks/use-jobs';
import { useColors } from '@/hooks/use-colors';
import { InterviewStatus } from '@/lib/db/types';

const statusOptions = [
  { value: InterviewStatus.BEFORE_APPLY, label: '投递前' },
  { value: InterviewStatus.APPLIED, label: '投递中' },
  { value: InterviewStatus.FIRST_ROUND, label: '一面' },
  { value: InterviewStatus.SECOND_ROUND, label: '二面' },
  { value: InterviewStatus.OFFER_RECEIVED, label: '已拿 offer' },
  { value: InterviewStatus.REJECTED, label: '面试未通过' },
];

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { jobs, isLoading, loadJobs, filterByStatus, filterByLocation } = useJobs();

  const [selectedStatus, setSelectedStatus] = useState<InterviewStatus | null>(null);
  const [searchLocation, setSearchLocation] = useState('');
  const [filteredJobs, setFilteredJobs] = useState(jobs);

  // 更新过滤后的岗位列表
  useEffect(() => {
    let filtered = jobs;

    if (selectedStatus) {
      filtered = filtered.filter((job) => job.status === selectedStatus);
    }

    if (searchLocation.trim()) {
      filtered = filtered.filter((job) =>
        job.location.toLowerCase().includes(searchLocation.toLowerCase())
      );
    }

    setFilteredJobs(filtered);
  }, [jobs, selectedStatus, searchLocation]);

  const handleStatusFilter = async (status: InterviewStatus | null) => {
    setSelectedStatus(status);
    if (status) {
      await filterByStatus(status);
    } else {
      await loadJobs();
    }
  };

  const handleAddJob = () => {
    router.push('/import');
  };

  const handleJobPress = (jobId: string) => {
    router.push(`/job-detail/${jobId}`);
  };

  if (isLoading && jobs.length === 0) {
    return (
      <ScreenContainer className="items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-4 text-foreground">加载岗位中...</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="p-4">
      <View className="flex-1 gap-4">
        {/* 标题 */}
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">岗位管理</Text>
          <Text className="text-sm text-muted">管理您的面试进度</Text>
        </View>

        {/* 筛选栏 */}
        <View className="gap-3">
          {/* 状态筛选 */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">按状态筛选</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              <TouchableOpacity
                onPress={() => handleStatusFilter(null)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: selectedStatus === null ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: selectedStatus === null ? colors.primary : colors.border,
                }}
              >
                <Text
                  style={{
                    color: selectedStatus === null ? colors.background : colors.foreground,
                    fontWeight: '500',
                    fontSize: 12,
                  }}
                >
                  全部
                </Text>
              </TouchableOpacity>

              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => handleStatusFilter(option.value)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor:
                      selectedStatus === option.value ? colors.primary : colors.surface,
                    borderWidth: 1,
                    borderColor:
                      selectedStatus === option.value ? colors.primary : colors.border,
                  }}
                >
                  <Text
                    style={{
                      color:
                        selectedStatus === option.value ? colors.background : colors.foreground,
                      fontWeight: '500',
                      fontSize: 12,
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* 地点搜索 */}
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">按地点搜索</Text>
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
              placeholder="输入城市或地点"
              placeholderTextColor={colors.muted}
              value={searchLocation}
              onChangeText={setSearchLocation}
            />
          </View>
        </View>

        {/* 岗位列表 */}
        {filteredJobs.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-4">
            <Text className="text-lg font-semibold text-foreground">暂无岗位</Text>
            <Text className="text-sm text-muted text-center">
              {jobs.length === 0
                ? '点击下方按钮添加您的第一个岗位'
                : '没有找到匹配的岗位'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredJobs}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <JobCard job={item} onPress={() => handleJobPress(item.id)} />
            )}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        )}

        {/* 浮动按钮 */}
        <TouchableOpacity
          onPress={handleAddJob}
          style={{
            position: 'absolute',
            bottom: 80,
            right: 16,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Text style={{ fontSize: 28, color: colors.background }}>+</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
