/**
 * 岗位卡片组件
 */

import { View, Text, TouchableOpacity } from 'react-native';
import { Job, InterviewStatus } from '@/lib/db/types';
import { useColors } from '@/hooks/use-colors';

interface JobCardProps {
  job: Job;
  onPress: () => void;
}

const statusConfig: Record<InterviewStatus, { label: string; color: string }> = {
  [InterviewStatus.BEFORE_APPLY]: { label: '投递前', color: '#687076' },
  [InterviewStatus.APPLIED]: { label: '投递中', color: '#0a7ea4' },
  [InterviewStatus.FIRST_ROUND]: { label: '一面', color: '#F59E0B' },
  [InterviewStatus.SECOND_ROUND]: { label: '二面', color: '#FF8C42' },
  [InterviewStatus.OFFER_RECEIVED]: { label: '已拿 offer', color: '#22C55E' },
  [InterviewStatus.REJECTED]: { label: '面试未通过', color: '#EF4444' },
};

export function JobCard({ job, onPress }: JobCardProps) {
  const colors = useColors();
  const status = statusConfig[job.status];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        marginBottom: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
      activeOpacity={0.7}
    >
      <View style={{ gap: 8 }}>
        {/* 公司名 + 状态标签 */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground, flex: 1 }}>
            {job.companyName}
          </Text>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 6,
              backgroundColor: status.color + '20',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '500', color: status.color }}>
              {status.label}
            </Text>
          </View>
        </View>

        {/* 岗位名 */}
        <Text style={{ fontSize: 14, fontWeight: '500', color: colors.foreground }}>
          {job.jobTitle}
        </Text>

        {/* 地点 */}
        <Text style={{ fontSize: 13, color: colors.muted }}>📍 {job.location}</Text>

        {/* 更新时间 */}
        <Text style={{ fontSize: 12, color: colors.muted }}>
          更新于 {new Date(job.updatedAt).toLocaleDateString('zh-CN')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
