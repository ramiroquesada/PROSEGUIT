import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api-client';

interface Usuario {
  id: number;
  nombre: string;
  ficha: number;
  email: string | null;
  rol: 'ADMIN' | 'TECNICO';
  activo: boolean;
  forcePasswordChange: boolean;
  oficina: { id: number; nombre: string } | null;
  createdAt: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<Usuario[]>('/users'),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      nombre: string;
      ficha: number;
      email?: string;
      rol: 'ADMIN' | 'TECNICO';
      oficinaId?: number;
    }) => api.post<Usuario & { tempPassword: string }>('/users', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; nombre?: string; email?: string; rol?: 'ADMIN' | 'TECNICO'; activo?: boolean }) =>
      api.put<Usuario>(`/users/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useResetPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post<{ message: string; tempPassword: string }>(`/users/${id}/reset-password`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/users/change-password', data),
  });
}

export type { Usuario };
