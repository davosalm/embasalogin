import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatTime(time: string): string {
  return time;
}

export function formatDateTime(dateString: string, time: string): string {
  const date = formatDate(dateString);
  return `${date} às ${time}`;
}

export function getRoleColor(role: string): { primary: string, bg: string } {
  switch (role) {
    case 'admin':
      return { primary: 'text-blue-800', bg: 'bg-blue-100' };
    case 'embasa':
      return { primary: 'text-blue-600', bg: 'bg-blue-100' };
    case 'sac':
      return { primary: 'text-green-700', bg: 'bg-green-100' };
    default:
      return { primary: 'text-neutral-700', bg: 'bg-neutral-100' };
  }
}

export function getRoleName(role: string): string {
  switch (role) {
    case 'admin':
      return 'Administrador';
    case 'embasa':
      return 'EMBASA';
    case 'sac':
      return 'SAC';
    default:
      return role;
  }
}

export function generateRandomCode(prefix: string): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${randomNum}`;
}
