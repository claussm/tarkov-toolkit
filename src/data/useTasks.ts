import { useQuery } from '@tanstack/react-query'
import { gqlClient } from '../api/client'
import { TASKS_QUERY } from '../api/queries'
import { cachedFetch } from '../lib/cache'
import type { TaskSummary } from '../api/types'

interface TasksResponse {
  tasks: TaskSummary[]
}

const ONE_DAY = 24 * 60 * 60 * 1000

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () =>
      cachedFetch('tt:tasks:v2', ONE_DAY, () =>
        gqlClient.request<TasksResponse>(TASKS_QUERY).then((r) => r.tasks),
      ),
    staleTime: ONE_DAY,
    gcTime: ONE_DAY,
  })
}
