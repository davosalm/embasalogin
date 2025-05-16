import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addMonths, subMonths, startOfMonth, getDay, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/header";
import CalendarGrid from "@/components/calendar-grid";

// UI Components
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
type Availability = {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  remainingSlots: number;
  createdBy: string;
  createdAt: string;
};

type EmbasaStats = {
  availableSlots: number;
  confirmedBookings: number;
  occupancyRate: string;
};

// Form schema for creating availability
const availabilityFormSchema = z.object({
  date: z.string().min(1, "Data é obrigatória"),
  startTime: z.string().min(1, "Horário inicial é obrigatório"),
  endTime: z.string().min(1, "Horário final é obrigatório"),
  capacity: z.coerce.number().min(1, "Capacidade deve ser pelo menos 1"),
});

type AvailabilityFormValues = z.infer<typeof availabilityFormSchema>;

export default function EmbasaDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState<Availability | null>(null);
  
  // Calculate statistics based on availabilities
  const calculateStats = (availabilities: Availability[]): EmbasaStats => {
    let totalSlots = 0;
    let remainingSlots = 0;
    
    availabilities.forEach(avail => {
      totalSlots += avail.capacity;
      remainingSlots += avail.remainingSlots;
    });
    
    const confirmedBookings = totalSlots - remainingSlots;
    const occupancyRate = totalSlots > 0 
      ? `${Math.round((confirmedBookings / totalSlots) * 100)}%` 
      : "0%";
    
    return {
      availableSlots: remainingSlots,
      confirmedBookings,
      occupancyRate
    };
  };

  // Redirect if not embasa user
  useEffect(() => {
    if (!user) {
      setLocation("/");
    } else if (user.role !== "embasa") {
      toast({ 
        title: "Acesso negado", 
        description: "Você não tem permissão para acessar essa página",
        variant: "destructive"
      });
      setLocation("/");
    }
  }, [user, setLocation, toast]);

  // Form for creating new availabilities
  const form = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilityFormSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: "08:00",
      endTime: "17:00",
      capacity: 5,
    },
  });

  // Query for availabilities by month
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  
  const {
    data: availabilities = [],
    isLoading: isLoadingAvailabilities,
    isError: isErrorAvailabilities,
  } = useQuery<Availability[]>({
    queryKey: ["/api/availabilities", year, month],
    queryFn: async () => {
      const res = await fetch(`/api/availabilities?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Failed to fetch availabilities");
      return res.json();
    },
    enabled: !!user && user.role === "embasa",
  });

  // Stats derived from availabilities
  const stats = calculateStats(availabilities);

  // Mutation for creating availabilities
  const createAvailabilityMutation = useMutation({
    mutationFn: async (data: AvailabilityFormValues) => {
      // Certifique-se de que a data está no formato correto
      console.log("Data sendo enviada:", data);
      
      await apiRequest("POST", "/api/availabilities", {
        ...data,
        remainingSlots: data.capacity,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availabilities"] });
      form.reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: "08:00",
        endTime: "17:00",
        capacity: 5,
      });
      toast({
        title: "Disponibilidade criada",
        description: "A disponibilidade foi adicionada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar disponibilidade",
        description: "Não foi possível adicionar a disponibilidade",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting availabilities
  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/availabilities/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availabilities"] });
      setIsDeleteDialogOpen(false);
      setSelectedAvailability(null);
      toast({
        title: "Disponibilidade removida",
        description: "A disponibilidade foi removida com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover disponibilidade",
        description: "Não foi possível remover a disponibilidade",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AvailabilityFormValues) => {
    // Garantindo que a data está no formato correto
    console.log("Dados do formulário:", data);
    
    // Certifique-se de que a data seja uma string no formato "YYYY-MM-DD"
    const dateValue = data.date;
    
    // Calculando horário final automaticamente (+ 2 horas)
    const startHourMinutes = data.startTime.split(':');
    const startHour = parseInt(startHourMinutes[0], 10);
    const startMinute = parseInt(startHourMinutes[1], 10);
    
    // Adicionar 2 horas ao horário inicial
    let endHour = startHour + 2;
    // Formatando para garantir duas casas (ex: "09:00" em vez de "9:00")
    const endTime = `${endHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
    
    // Definindo capacidade fixa como 1
    const capacityValue = 1;
    
    createAvailabilityMutation.mutate({
      ...data,
      date: dateValue,
      endTime: endTime,
      capacity: capacityValue
    });
  };

  const handleDeleteAvailability = () => {
    if (selectedAvailability) {
      deleteAvailabilityMutation.mutate(selectedAvailability.id);
    }
  };

  const openDeleteDialog = (availability: Availability) => {
    setSelectedAvailability(availability);
    setIsDeleteDialogOpen(true);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  // Calendar data preparation
  const firstDayOfMonth = startOfMonth(currentDate);
  const startDay = getDay(firstDayOfMonth);
  const daysInMonth = getDaysInMonth(currentDate);
  
  // Group availabilities by date for the calendar display
  const availabilitiesByDate: Record<string, Availability[]> = {};
  
  availabilities.forEach(avail => {
    const dateStr = format(new Date(avail.date), 'yyyy-MM-dd');
    if (!availabilitiesByDate[dateStr]) {
      availabilitiesByDate[dateStr] = [];
    }
    availabilitiesByDate[dateStr].push(avail);
  });

  if (isErrorAvailabilities) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-semibold text-red-500">Erro ao carregar dados</h1>
        <p className="mt-2">Não foi possível carregar as disponibilidades.</p>
        <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/availabilities"] })}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="embasa-theme min-h-screen bg-neutral-50">
      <Header 
        title="Painel EMBASA"
        icon="event_available"
        role="embasa"
        onLogout={logout}
      />

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-blue-600 flex items-center">
              <span className="material-icons mr-2">calendar_month</span>
              Disponibilidade de Atendimento
            </CardTitle>
            <CardDescription>
              Gerencie os horários disponíveis para atendimento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Calendar management image */}
            <div className="mb-6">
              <img 
                src="https://images.unsplash.com/photo-1606327054629-64c8b0fd6e4f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400" 
                alt="Calendar management interface" 
                className="rounded-lg w-full h-48 object-cover"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Calendar Controls */}
              <div className="lg:col-span-1">
                <Card className="bg-blue-50 border-0 mb-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-blue-600 flex items-center">
                      <span className="material-icons mr-1 text-xl">date_range</span>
                      Adicionar Disponibilidade
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="startTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horário Inicial</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Campo endTime oculto com valor automático */}
                        <input 
                          type="hidden" 
                          {...form.register("endTime")}
                        />
                        
                        {/* Campo capacity oculto com valor padrão */}
                        <input 
                          type="hidden" 
                          {...form.register("capacity")}
                        />

                        <Button 
                          type="submit" 
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          disabled={createAvailabilityMutation.isPending}
                        >
                          {createAvailabilityMutation.isPending ? "Adicionando..." : "Adicionar Horários"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                <Card className="bg-neutral-50 border border-neutral-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-blue-600 flex items-center">
                      <span className="material-icons mr-1 text-xl">info</span>
                      Estatísticas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Horários Disponíveis:</span>
                        <span className="font-medium text-blue-600">{stats.availableSlots}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Agendamentos Confirmados:</span>
                        <span className="font-medium text-blue-600">{stats.confirmedBookings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-600">Taxa de Ocupação:</span>
                        <span className="font-medium text-blue-600">{stats.occupancyRate}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Calendar View */}
              <div className="lg:col-span-2">
                <h3 className="font-medium text-blue-600 mb-4 flex items-center">
                  <span className="material-icons mr-1">view_comfy</span>
                  Visão do Calendário
                </h3>

                <div className="flex justify-between items-center mb-4">
                  <Button 
                    variant="ghost"
                    onClick={handlePreviousMonth}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"
                  >
                    <span className="material-icons">chevron_left</span>
                  </Button>
                  <h4 className="font-medium text-lg">
                    {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                  </h4>
                  <Button 
                    variant="ghost"
                    onClick={handleNextMonth}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"
                  >
                    <span className="material-icons">chevron_right</span>
                  </Button>
                </div>

                <CalendarGrid
                  year={year}
                  month={month}
                  availabilitiesByDate={availabilitiesByDate}
                  isLoading={isLoadingAvailabilities}
                  onAvailabilityClick={openDeleteDialog}
                  role="embasa"
                />

                <div className="mt-4 text-sm text-neutral-600">
                  <p className="flex items-center mb-1">
                    <span className="w-3 h-3 inline-block bg-blue-100 rounded-full mr-2"></span>
                    Horários disponíveis para atendimento
                  </p>
                  <p>Clique em um horário para ver os detalhes ou removê-lo</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Alert dialog for deleting availability */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Disponibilidade</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedAvailability && (
                <>
                  Você está prestes a remover a disponibilidade do dia{" "}
                  {format(new Date(selectedAvailability.date), 'dd/MM/yyyy')}, das{" "}
                  {selectedAvailability.startTime} às {selectedAvailability.endTime}.
                  <br /><br />
                  Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAvailability}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteAvailabilityMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
