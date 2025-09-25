import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRequest, postRequest } from "@/lib/queryClient";

export type Pomodoro = {
  id: number;
  todoId: number;
  task: string;
  detail: string;
  payload: Payload;
};

export type Payload = {
  finished: boolean;
  times: [number, number][];
};

const keyTodayPomodoro = () => ["/api/today/pomodoro"];

export function useTodayPomodoro() {
  return useQuery({
    queryKey: keyTodayPomodoro(),
    queryFn: async () => {
      const response = await getRequest("/api/pomodoro?Action=ListToday");
      const data = await response.json();
      const pomodoros = data.message.pomodoros as Pomodoro[];
      const pomodoroMap = pomodoros.reduce(
        (map: Record<number, Pomodoro[]>, p) => {
          if (!map[p.todoId]) {
            map[p.todoId] = [];
          }
          map[p.todoId].push(p);
          return map;
        },
        {},
      ) as Record<number, Pomodoro[]>;
      if (pomodoros.length !== 0) {
        if (!pomodoros[0].payload.finished) {
          // used to show if there is ongoing pomodoro
          pomodoroMap[0] = [pomodoros[0]];
        }
      }
      return pomodoroMap;
    },
  });
}

export function useCreatePomodoro(todoId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { task: string }) => {
      const response = await postRequest(
        "/api/pomodoro?Action=CreatePomodoro",
        {
          todoId,
          task: data.task,
          payload: {
            finished: false,
            times: [[Date.now(), 0]],
          },
        },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyTodayPomodoro(),
      });
    },
  });
}
