import { createRoot } from "react-dom/client";
import { QueryClientProvider } from '@tanstack/react-query';
import App from "./App";
import "./index.css";
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/hooks/use-auth';
import { ToastProvider } from '@/components/toast-provider';
import { ThemeProvider } from 'next-themes';

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider />
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);
