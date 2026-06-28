/**
 * 岗位卡片组件 —— 按 CareerPulse 设计稿重构
 * 视觉：白卡 + 1px 细边框，公司 logo 占位、状态药丸、信息 chip，
 * 进行中岗位展示流程进度条，已录用展示 Offer 提醒块，不合适展示流程结束页脚。
 */

import { View, Text, TouchableOpacity } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Job, InterviewStatus } from '@/lib/db/types';
import { useColors } from '@/hooks/use-colors';

interface JobCardProps {
  job: Job;
  onPress: () => void;
}

type StatusGroup = 'progress' | 'offer' | 'rejected';

function getGroup(status: InterviewStatus): StatusGroup {
  if (status === InterviewStatus.OFFER_RECEIVED) return 'offer';
  if (status === InterviewStatus.REJECTED) return 'rejected';
  return 'progress';
}

// 进行中流程的 4 个里程碑
const PIPELINE = ['已投递', '简历筛选', '一面安排', 'HR面'] as const;
const STEP_BY_STATUS: Partial<Record<InterviewStatus, number>> = {
  [InterviewStatus.BEFORE_APPLY]: 0,
  [InterviewStatus.APPLIED]: 1,
  [InterviewStatus.FIRST_ROUND]: 2,
  [InterviewStatus.SECOND_ROUND]: 3,
};

function formatUpdatedAt(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return `今天 ${time}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${time}`;
}

function withAlpha(hex: string, alpha: string) {
  return `${hex}${alpha}`;
}

export function JobCard({ job, onPress }: JobCardProps) {
  const colors = useColors();
  const group = getGroup(job.status);

  // 状态药丸配置
  const pill = {
    progress: { label: '面试中', icon: 'sync' as const, bg: colors.primary, fg: '#FFFFFF' },
    offer: {
      label: '已录用',
      icon: 'task-alt' as const,
      bg: withAlpha(colors.success, '22'),
      fg: colors.success,
    },
    rejected: {
      label: '暂不合适',
      icon: 'block' as const,
      bg: withAlpha(colors.muted, '1F'),
      fg: colors.muted,
    },
  }[group];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
        gap: 12,
      }}
    >
      {/* 头部：logo + 标题/公司 + 状态药丸 */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary }}>
            {(job.companyName || '?').trim().charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 17, fontWeight: '700', color: colors.foreground, lineHeight: 23 }}
            numberOfLines={2}
          >
            {job.jobTitle}
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, marginTop: 2 }} numberOfLines={1}>
            {job.companyName}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 9999,
            backgroundColor: pill.bg,
          }}
        >
          <MaterialIcons name={pill.icon} size={14} color={pill.fg} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: pill.fg }}>{pill.label}</Text>
        </View>
      </View>

      {/* 信息 chip 行：地点 / 薪资 / 经验 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <InfoChip icon="location-on" text={job.location} colors={colors} />
        {!!job.salary && <InfoChip icon="payments" text={job.salary} colors={colors} />}
        {!!job.experience && <InfoChip icon="work" text={job.experience} colors={colors} />}
      </View>

      {/* 进行中：分隔线 + 流程进度条 + 更新时间 */}
      {group === 'progress' && (
        <>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 2 }} />
          <Pipeline status={job.status} colors={colors} />
          <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'right' }}>
            更新于: {formatUpdatedAt(job.updatedAt)}
          </Text>
        </>
      )}

      {/* 已录用：Offer 提醒块 */}
      {group === 'offer' && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: 12,
            borderRadius: 12,
            backgroundColor: withAlpha(colors.success, '12'),
            borderWidth: 1,
            borderColor: withAlpha(colors.success, '33'),
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>
              Offer 待确认
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
              点击查看 Offer 详情
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: colors.success,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>查看详情</Text>
          </View>
        </View>
      )}

      {/* 不合适：流程结束页脚 */}
      {group === 'rejected' && (
        <Text style={{ fontSize: 12, color: colors.muted }}>
          流程结束于: {formatUpdatedAt(job.updatedAt)}
        </Text>
      )}
    </TouchableOpacity>
  );
}

function InfoChip({
  icon,
  text,
  colors,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  text: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: colors.background,
      }}
    >
      <MaterialIcons name={icon} size={14} color={colors.muted} />
      <Text style={{ fontSize: 13, color: colors.foreground }}>{text}</Text>
    </View>
  );
}

function Pipeline({
  status,
  colors,
}: {
  status: InterviewStatus;
  colors: ReturnType<typeof useColors>;
}) {
  const activeStep = STEP_BY_STATUS[status] ?? 0;

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {PIPELINE.map((label, i) => {
        const completed = i < activeStep;
        const active = i === activeStep;
        const tint = completed || active ? colors.primary : colors.muted;
        return (
          <View key={label} style={{ alignItems: 'center', gap: 6, flex: 1 }}>
            {completed ? (
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialIcons name="check" size={14} color="#FFFFFF" />
              </View>
            ) : (
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: active ? colors.primary : colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {active && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.primary,
                    }}
                  />
                )}
              </View>
            )}
            <Text style={{ fontSize: 11, color: tint, fontWeight: active ? '700' : '500' }}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
