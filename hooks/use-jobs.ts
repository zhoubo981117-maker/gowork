/**
 * 岗位管理 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { Job, InterviewStatus } from '@/lib/db/types';
import {
  getAllJobs,
  addJob as dbAddJob,
  updateJob,
  deleteJob,
} from '@/lib/db/database';

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 加载所有岗位
  const loadJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getAllJobs();
      setJobs(data);
      setError(null);
    } catch (err) {
      console.error('[useJobs] Error loading jobs:', err);
      setError(err instanceof Error ? err : new Error('Failed to load jobs'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 延迟初始加载 - 等待数据库准备好
  useEffect(() => {
    const timer = setTimeout(() => {
      loadJobs();
    }, 500);
    return () => clearTimeout(timer);
  }, [loadJobs]);

  // 创建岗位
  const addJob = useCallback(
    async (jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const newJob = await dbAddJob(jobData);
        setJobs((prev) => [newJob, ...prev]);
        return newJob;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create job');
        console.error('[useJobs] Error adding job:', error);
        setError(error);
        throw error;
      }
    },
    []
  );

  // 更新岗位
  const modifyJob = useCallback(async (id: string, updates: Partial<Omit<Job, 'id' | 'createdAt'>>) => {
    try {
      const updated = await updateJob(id, updates);
      setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
      return updated;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update job');
      console.error('[useJobs] Error updating job:', error);
      setError(error);
      throw error;
    }
  }, []);

  // 删除岗位
  const removeJob = useCallback(async (id: string) => {
    try {
      await deleteJob(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete job');
      console.error('[useJobs] Error deleting job:', error);
      setError(error);
      throw error;
    }
  }, []);

  // 按状态过滤
  const filterByStatus = useCallback(async (status: InterviewStatus) => {
    try {
      setIsLoading(true);
      const data = await getAllJobs();
      const filtered = data.filter((job) => job.status === status);
      setJobs(filtered);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to filter jobs');
      console.error('[useJobs] Error filtering by status:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 按地点过滤
  const filterByLocation = useCallback(async (location: string) => {
    try {
      setIsLoading(true);
      const data = await getAllJobs();
      const filtered = data.filter((job) => job.location === location);
      setJobs(filtered);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to filter jobs');
      console.error('[useJobs] Error filtering by location:', error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    jobs,
    isLoading,
    error,
    loadJobs,
    addJob,
    modifyJob,
    removeJob,
    filterByStatus,
    filterByLocation,
  };
}
