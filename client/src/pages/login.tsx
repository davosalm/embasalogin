import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn } from "lucide-react";

const loginSchema = z.object({
  accessCode: z.string().min(1, "Código de acesso é obrigatório"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      accessCode: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        accessCode: data.accessCode,
      });
      
      const userData = await response.json();
      login(userData.user);

      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo ao Sistema de Agendamento!`,
      });

      // Redirect based on user role
      if (userData.user.role === "admin") {
        setLocation("/admin");
      } else if (userData.user.role === "embasa") {
        setLocation("/embasa");
      } else if (userData.user.role === "sac") {
        setLocation("/sac");
      }
    } catch (error) {
      toast({
        title: "Erro ao fazer login",
        description: "Código inválido. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-neutral-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              Sistema de Agendamento
            </h1>
            <p className="text-neutral-600">Acesse com seu código de usuário</p>
          </div>

          {/* User login image */}
          <div className="mb-8 flex justify-center">
            <img
              src="https://images.unsplash.com/photo-1516321497487-e288fb19713f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400"
              alt="Login interface"
              className="rounded-lg w-full h-auto"
            />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="accessCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Acesso</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite seu código de acesso"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full bg-blue-500 hover:bg-blue-600" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <span>Carregando...</span>
                ) : (
                  <>
                    <span>Acessar</span>
                    <LogIn className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
