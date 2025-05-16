// Role types
export const ROLES = {
  ADMIN: 'admin',
  EMBASA: 'embasa',
  SAC: 'sac'
} as const;

// Role colors
export const ROLE_COLORS = {
  [ROLES.ADMIN]: {
    primary: '#3F51B5',
    secondary: '#303F9F',
    light: '#C5CAE9',
    bg: 'bg-blue-800',
    text: 'text-blue-800',
    lightBg: 'bg-blue-100'
  },
  [ROLES.EMBASA]: {
    primary: '#2196F3',
    secondary: '#1976D2',
    light: '#BBDEFB',
    bg: 'bg-blue-600',
    text: 'text-blue-600',
    lightBg: 'bg-blue-100'
  },
  [ROLES.SAC]: {
    primary: '#4CAF50',
    secondary: '#388E3C',
    light: '#C8E6C9',
    bg: 'bg-green-700',
    text: 'text-green-700',
    lightBg: 'bg-green-100'
  }
} as const;

// Role display names
export const ROLE_NAMES = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.EMBASA]: 'EMBASA',
  [ROLES.SAC]: 'SAC'
} as const;

// Status colors
export const STATUS_COLORS = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700'
} as const;

// Booking status options
export const BOOKING_STATUS = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending',
  CANCELLED: 'cancelled'
} as const;

// Days of week
export const DAYS_OF_WEEK = [
  'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'
] as const;
