import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, addMonths, subMonths } from "date-fns";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

type Booking = {
  id: number;
  availabilityId: number;
  clientName: string;
  clientDocument: string;
  clientPhone: string;
  timeSlot: string;
  createdBy: string;
  createdAt: string;
  status: string;
};

// Form schema for booking appointment
const bookingFormSchema = z.object({
  clientName: z.string().min(1, "Nome é obrigatório"),
  serviceNumber: z.string().min(1, "Número da SS é obrigatório"),
  clientDocument: z.string().optional(),
  clientPhone: z.string().optional(),
  timeSlot: z.string().min(1, "Horário é obrigatório"),
  comments: z.string().optional(),
  availabilityId: z.number(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

// Function to create time slots based on start and end time
const createTimeSlots = (startTime: string, endTime: string): string[] => {
  const slots: string[] = [];
  const start = parseInt(startTime.split(':')[0]);
  const end = parseInt(endTime.split(':')[0]);
  
  for (let hour = start; hour < end; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
  }
  
  return slots;
};

export default function SacDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAvailability, setSelectedAvailability] = useState<Availability | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  // Form for booking appointment
  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      clientName: "",
      serviceNumber: "",
      clientDocument: "",
      clientPhone: "",
      timeSlot: "",
      comments: "",
      availabilityId: 0,
    },
  });

  // Redirect if not SAC user
  useEffect(() => {
    if (!user) {
      setLocation("/");
    } else if (user.role !== "sac") {
      toast({ 
        title: "Acesso negado", 
        description: "Você não tem permissão para acessar essa página",
        variant: "destructive"
      });
      setLocation("/");
    }
  }, [user, setLocation, toast]);

  // Update time slots when selected availability changes
  useEffect(() => {
    if (selectedAvailability) {
      const slots = createTimeSlots(
        selectedAvailability.startTime,
        selectedAvailability.endTime
      );
      setTimeSlots(slots);
      
      // Reset form with default values
      form.reset({
        clientName: "",
        serviceNumber: "",
        clientDocument: "",
        clientPhone: "",
        timeSlot: "",
        comments: "",
        availabilityId: selectedAvailability.id,
      });
    } else {
      setTimeSlots([]);
    }
  }, [selectedAvailability, form]);

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
    enabled: !!user && user.role === "sac",
  });

  // Query for user's bookings
  const {
    data: bookings = [],
    isLoading: isLoadingBookings,
  } = useQuery<Booking[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user && user.role === "sac",
  });

  // Mutation for creating booking
  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormValues) => {
      await apiRequest("POST", "/api/bookings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/availabilities"] });
      setSelectedAvailability(null);
      form.reset();
      toast({
        title: "Agendamento confirmado",
        description: "Seu agendamento foi realizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao agendar",
        description: "Não foi possível realizar o agendamento",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BookingFormValues) => {
    createBookingMutation.mutate(data);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleSelectDate = (availability: Availability) => {
    // Only allow selection if there are remaining slots
    if (availability.remainingSlots > 0) {
      setSelectedAvailability(availability);
    } else {
      toast({
        title: "Horário indisponível",
        description: "Não há mais vagas disponíveis para este horário",
        variant: "destructive",
      });
    }
  };

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
    <div className="sac-theme min-h-screen bg-neutral-50">
      <Header 
        title="Painel SAC"
        icon="support_agent"
        role="sac"
        onLogout={logout}
      />

      <main className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-green-700 flex items-center">
              <span className="material-icons mr-2">schedule</span>
              Agendamento de Atendimento
            </CardTitle>
            <CardDescription>
              Selecione um horário disponível para agendar seu atendimento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Calendar scheduling image */}
            <div className="mb-6">
              <img 
                src="https://images.unsplash.com/photo-1506784365847-bbad939e9335?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400" 
                alt="Scheduling calendar interface" 
                className="rounded-lg w-full h-48 object-cover"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Available Dates */}
              <div className="lg:col-span-2">
                <h3 className="font-medium text-green-700 mb-4 flex items-center">
                  <span className="material-icons mr-1">view_comfy</span>
                  Datas Disponíveis
                </h3>

                <div className="flex justify-between items-center mb-4">
                  <Button 
                    variant="ghost"
                    onClick={handlePreviousMonth}
                    className="p-2 text-green-700 hover:bg-green-100 rounded-full"
                  >
                    <span className="material-icons">chevron_left</span>
                  </Button>
                  <h4 className="font-medium text-lg">
                    {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                  </h4>
                  <Button 
                    variant="ghost"
                    onClick={handleNextMonth}
                    className="p-2 text-green-700 hover:bg-green-100 rounded-full"
                  >
                    <span className="material-icons">chevron_right</span>
                  </Button>
                </div>

                <CalendarGrid
                  year={year}
                  month={month}
                  availabilitiesByDate={availabilitiesByDate}
                  isLoading={isLoadingAvailabilities}
                  onAvailabilityClick={handleSelectDate}
                  role="sac"
                />

                <div className="mt-4 text-sm text-neutral-600">
                  <p className="flex items-center">
                    <span className="w-3 h-3 inline-block bg-green-100 rounded-full mr-2"></span>
                    Clique em uma data disponível para agendar seu atendimento
                  </p>
                </div>
              </div>

              {/* Booking Form */}
              <div className="lg:col-span-1">
                <Card className={`bg-green-50 border-0 ${!selectedAvailability ? 'opacity-70' : ''}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-green-700 flex items-center">
                      <span className="material-icons mr-1 text-xl">book_online</span>
                      Realize seu Agendamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="availabilityId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Data Selecionada</FormLabel>
                              <FormControl>
                                <Input 
                                  value={selectedAvailability 
                                    ? format(new Date(selectedAvailability.date), 'dd/MM/yyyy')
                                    : "Selecione uma data no calendário"
                                  }
                                  disabled
                                  className="bg-neutral-100"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="timeSlot"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Horário Disponível</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                disabled={!selectedAvailability}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione um horário" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {timeSlots.map((slot) => (
                                    <SelectItem key={slot} value={slot}>
                                      {slot}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="clientName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome Completo</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Digite seu nome completo"
                                  {...field}
                                  disabled={!selectedAvailability}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="serviceNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número da SS</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Número da Solicitação de Serviço"
                                  {...field}
                                  disabled={!selectedAvailability}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="comments"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Comentários sobre a Visita Técnica</FormLabel>
                              <FormControl>
                                <textarea 
                                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  placeholder="Descreva detalhes importantes sobre a visita técnica"
                                  {...field}
                                  disabled={!selectedAvailability}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          className="w-full bg-green-700 hover:bg-green-800"
                          disabled={!selectedAvailability || createBookingMutation.isPending}
                        >
                          {createBookingMutation.isPending ? "Confirmando..." : "Confirmar Agendamento"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>

                <Card className="bg-neutral-100 border border-neutral-200 mt-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-green-700 flex items-center">
                      <span className="material-icons mr-1 text-xl">history</span>
                      Meus Agendamentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingBookings ? (
                      <div className="text-center py-4">
                        <p>Carregando agendamentos...</p>
                      </div>
                    ) : bookings.length === 0 ? (
                      <p className="text-sm text-neutral-600 py-2">
                        Você ainda não possui agendamentos
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {bookings.map(booking => {
                          // Find the availability that matches this booking
                          const availability = availabilities.find(a => a.id === booking.availabilityId);
                          return (
                            <div key={booking.id} className="bg-white p-3 rounded-md shadow-sm">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">
                                    {availability 
                                      ? format(new Date(availability.date), 'dd/MM/yyyy')
                                      : 'Data indisponível'
                                    }
                                  </p>
                                  <p className="text-sm text-neutral-600">
                                    {booking.timeSlot}
                                  </p>
                                </div>
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                  {booking.status === 'confirmed' ? 'Confirmado' : booking.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
