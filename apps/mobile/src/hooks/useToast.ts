import { showToast } from '@/components/ui/Toast';

export function useToast() {
  return {
    success: (msg: string) => showToast('success', msg),
    error: (msg: string) => showToast('error', msg),
    info: (msg: string) => showToast('info', msg),
  };
}