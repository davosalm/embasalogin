import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { Pencil, Trash2, Plus, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import Header from "@/components/header";

// UI Components
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Types
type AccessCode = {
  id: number;
  code: string;
  role: string;
  createdAt: string;
  active: boolean;
};

type AdminStats = {
  adminCount: number;
  embasaCount: number;
  sacCount: number;
  activeSchedules: number;
};

// Form schema for generating new access codes
const codeFormSchema = z.object({
  code: z.string().min(6, "Código deve ter pelo menos 6 caracteres"),
  role: z.enum(["admin", "embasa", "sac"], {
    required_error: "Selecione um tipo de usuário",
  }),
  location: z.string().optional(),
  active: z.boolean().default(true),
});

type CodeFormValues = z.infer<typeof codeFormSchema>;

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState<AccessCode | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!user) {
      setLocation("/");
    } else if (user.role !== "admin") {
      toast({ 
        title: "Acesso negado", 
        description: "Você não tem permissão para acessar essa página",
        variant: "destructive"
      });
      setLocation("/");
    }
  }, [user, setLocation, toast]);

  // Query for access codes
  const {
    data: accessCodes = [],
    isLoading: isLoadingCodes,
    isError: isErrorCodes,
  } = useQuery<AccessCode[]>({
    queryKey: ["/api/access-codes"],
    enabled: !!user && user.role === "admin",
  });

  // Query for admin stats
  const {
    data: stats = { adminCount: 0, embasaCount: 0, sacCount: 0, activeSchedules: 0 },
    isLoading: isLoadingStats,
  } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: !!user && user.role === "admin",
  });

  // Form for creating new access codes
  const form = useForm<CodeFormValues>({
    resolver: zodResolver(codeFormSchema),
    defaultValues: {
      code: "",
      role: "sac",
      location: "",
      active: true,
    },
  });

  // Form for editing access codes
  const editForm = useForm<CodeFormValues>({
    resolver: zodResolver(codeFormSchema),
    defaultValues: {
      code: "",
      role: "sac",
      active: true,
    },
  });

  // Mutation for creating access codes
  const createCodeMutation = useMutation({
    mutationFn: async (data: CodeFormValues) => {
      await apiRequest("POST", "/api/access-codes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/access-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Código criado",
        description: "O código de acesso foi criado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar código",
        description: "Não foi possível criar o código de acesso",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating access codes
  const updateCodeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CodeFormValues }) => {
      await apiRequest("PATCH", `/api/access-codes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/access-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setIsEditDialogOpen(false);
      setSelectedCode(null);
      toast({
        title: "Código atualizado",
        description: "O código de acesso foi atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar código",
        description: "Não foi possível atualizar o código de acesso",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting access codes
  const deleteCodeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/access-codes/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/access-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setIsDeleteDialogOpen(false);
      setSelectedCode(null);
      toast({
        title: "Código removido",
        description: "O código de acesso foi removido com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover código",
        description: "Não foi possível remover o código de acesso",
        variant: "destructive",
      });
    },
  });

  const onSubmitNewCode = (data: CodeFormValues) => {
    createCodeMutation.mutate(data);
  };

  const onSubmitEditCode = (data: CodeFormValues) => {
    if (selectedCode) {
      updateCodeMutation.mutate({ id: selectedCode.id, data });
    }
  };

  const handleDeleteCode = () => {
    if (selectedCode) {
      deleteCodeMutation.mutate(selectedCode.id);
    }
  };

  const openEditDialog = (code: AccessCode) => {
    setSelectedCode(code);
    editForm.reset({
      code: code.code,
      role: code.role as "admin" | "embasa" | "sac",
      active: code.active,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (code: AccessCode) => {
    setSelectedCode(code);
    setIsDeleteDialogOpen(true);
  };

  const generateRandomCode = () => {
    const role = form.getValues("role");
    const prefix = role === "admin" ? "ADM" : role === "embasa" ? "EMB" : "SAC";
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    form.setValue("code", `${prefix}${randomNum}`);
  };

  if (isErrorCodes) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-semibold text-red-500">Erro ao carregar dados</h1>
        <p className="mt-2">Não foi possível carregar os códigos de acesso.</p>
        <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/access-codes"] })}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="admin-theme min-h-screen bg-neutral-50">
      <Header 
        title="Painel Administrador"
        icon="admin_panel_settings"
        role="admin"
        onLogout={logout}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Admin dashboard image */}
        <div className="mb-8">
          <img 
            src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400" 
            alt="Admin dashboard interface" 
            className="rounded-lg w-full h-48 object-cover"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Access Codes Management */}
          <div className="col-span-1 lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-blue-800 flex items-center">
                    <span className="material-icons mr-2">vpn_key</span>
                    Gerenciamento de Códigos
                  </CardTitle>
                  <CardDescription>
                    Gerencie os códigos de acesso ao sistema
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    form.reset();
                    setIsAddDialogOpen(true);
                  }}
                  className="bg-blue-800 hover:bg-blue-900"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Código
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingCodes ? (
                  <div className="py-8 text-center">
                    <p>Carregando códigos de acesso...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Código</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Data de Criação</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accessCodes.map((code) => (
                          <TableRow key={code.id}>
                            <TableCell className="font-medium">{code.code}</TableCell>
                            <TableCell>
                              <span 
                                className={`px-2 py-1 rounded-full text-xs font-medium 
                                  ${code.role === 'admin' ? 'bg-blue-100 text-blue-800' : 
                                    code.role === 'embasa' ? 'bg-blue-100 text-blue-600' : 
                                    'bg-green-100 text-green-700'}`
                                }
                              >
                                {code.role === 'admin' ? 'Administrador' : 
                                 code.role === 'embasa' ? 'EMBASA' : 'SAC'}
                              </span>
                            </TableCell>
                            <TableCell>{format(new Date(code.createdAt), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>
                              <span 
                                className={`px-2 py-1 rounded-full text-xs font-medium 
                                  ${code.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`
                                }
                              >
                                {code.active ? 'Ativo' : 'Inativo'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => openEditDialog(code)}
                                  className="text-blue-800 hover:text-blue-900 hover:bg-blue-50"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => openDeleteDialog(code)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Card */}
          <div className="col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl text-blue-800 flex items-center">
                  <span className="material-icons mr-2">analytics</span>
                  Resumo
                </CardTitle>
                <CardDescription>
                  Estatísticas do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoadingStats ? (
                  <div className="text-center py-4">
                    <p>Carregando estatísticas...</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 p-4 rounded-lg flex items-center">
                      <span className="material-icons text-blue-800 mr-3 text-2xl">admin_panel_settings</span>
                      <div>
                        <p className="text-sm text-neutral-600">Total de Administradores</p>
                        <p className="text-2xl font-bold text-blue-800">{stats.adminCount}</p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg flex items-center">
                      <span className="material-icons text-blue-600 mr-3 text-2xl">event_available</span>
                      <div>
                        <p className="text-sm text-neutral-600">Usuários EMBASA</p>
                        <p className="text-2xl font-bold text-blue-600">{stats.embasaCount}</p>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg flex items-center">
                      <span className="material-icons text-green-700 mr-3 text-2xl">support_agent</span>
                      <div>
                        <p className="text-sm text-neutral-600">Usuários SAC</p>
                        <p className="text-2xl font-bold text-green-700">{stats.sacCount}</p>
                      </div>
                    </div>
                    
                    <div className="bg-neutral-100 p-4 rounded-lg flex items-center">
                      <span className="material-icons text-neutral-800 mr-3 text-2xl">calendar_today</span>
                      <div>
                        <p className="text-sm text-neutral-600">Agendamentos Ativos</p>
                        <p className="text-2xl font-bold text-neutral-800">{stats.activeSchedules}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Dialog for creating new access code */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Novo Código</DialogTitle>
            <DialogDescription>
              Crie um novo código de acesso para o sistema
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitNewCode)} className="space-y-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Usuário</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="embasa">EMBASA</SelectItem>
                        <SelectItem value="sac">SAC</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Acesso</FormLabel>
                    <div className="flex space-x-2">
                      <FormControl>
                        <Input
                          placeholder="Código será gerado automaticamente"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateRandomCode}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-800 hover:bg-blue-900"
                  disabled={createCodeMutation.isPending}
                >
                  {createCodeMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog for editing access code */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Código</DialogTitle>
            <DialogDescription>
              Altere os detalhes do código de acesso
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onSubmitEditCode)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Acesso</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Código de acesso"
                        {...field}
                        disabled
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Usuário</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="embasa">EMBASA</SelectItem>
                        <SelectItem value="sac">SAC</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Ativo</FormLabel>
                      <p className="text-sm text-neutral-600">
                        O código está ativo e permite acesso ao sistema
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-800 hover:bg-blue-900"
                  disabled={updateCodeMutation.isPending}
                >
                  {updateCodeMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Alert dialog for deleting access code */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá desativar o código de acesso {selectedCode?.code}. Este código não poderá mais ser utilizado para acessar o sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCode}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteCodeMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
