/**
 * 首页 —— CareerPulse 概览仪表盘
 * 展示求职进度统计（总投递 / 面试中 / 已录用）与最近动态，引导进入投递记录。
 */

import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ScreenContainer } from '@/components/screen-container';
import { useJobs } from '@/hooks/use-jobs';
import { useColors } from '@/hooks/use-colors';
import { InterviewStatus } from '@/lib/db/types';

const INTERVIEWING = [
  InterviewStatus.BEFORE_APPLY,
  InterviewStatus.APPLIED,
  InterviewStatus.FIRST_ROUND,
  InterviewStatus.SECOND_ROUND,
];

export default function HomeDashboard() {
  const router = useRouter();
  const colors = useColors();
  const { jobs, loadJobs } = useJobs();

  useFocusEffect(
    useCallback(() => {
      loadJobs();
    }, [loadJobs])
  );

  const total = jobs.length;
  const interviewing = jobs.filter((j) => INTERVIEWING.includes(j.status)).length;
  const hired = jobs.filter((j) => j.status === InterviewStatus.OFFER_RECEIVED).length;

  const stats = [
    { label: '总投递', value: total, icon: 'work-history' as const, color: colors.primary },
    { label: '面试中', value: interviewing, icon: 'sync' as const, color: colors.warning },
    { label: '已录用', value: hired, icon: 'task-alt' as const, color: colors.success },
  ];

  const recent = [...jobs].slice(0, 3);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 96, gap: 20 }}>
        {/* 欢迎语 */}
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 15, color: colors.muted }}>欢迎回来 👋</Text>
          <Text style={{ fontSize: 28, fontWeight: '800', color: colors.foreground }}>
            掌控你的求职节奏
          </Text>
        </View>

        {/* 统计卡片 */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {stats.map((s) => (
            <View
              key={s.label}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 16,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 8,
              }}
            >
              <MaterialIcons name={s.icon} size={20} color={s.color} />
              <Text style={{ fontSize: 24, fontWeight: '800', color: colors.foreground }}>
                {s.value}
              </Text>
              <Text style={{ fontSize: 12, color: colors.muted }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* 主操作 */}
        <TouchableOpacity
          onPress={() => router.push('/import')}
          activeOpacity={0.9}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            height: 52,
            borderRadius: 12,
            backgroundColor: colors.primary,
          }}
        >
          <MaterialIcons name="add" size={22} color="#FFFFFF" />
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>新增一条投递</Text>
        </TouchableOpacity>

        {/* 最近动态 */}
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground }}>最近动态</Text>
            <TouchableOpacity onPress={() => router.push('/')}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>查看全部</Text>
            </TouchableOpacity>
          </View>

          {recent.length === 0 ? (
            <View
              style={{
                alignItems: 'center',
                paddingVertical: 40,
                gap: 8,
                backgroundColor: colors.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <MaterialIcons name="inbox" size={40} color={colors.muted} />
              <Text style={{ fontSize: 14, color: colors.muted }}>还没有投递记录</Text>
            </View>
          ) : (
            recent.map((job) => (
              <TouchableOpacity
                key={job.id}
                onPress={() => router.push(`/job-detail/${job.id}`)}
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
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.primary }}>
                    {(job.companyName || '?').trim().charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }} numberOfLines={1}>
                    {job.jobTitle}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.muted }} numberOfLines={1}>
                    {job.companyName}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
