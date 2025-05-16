import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay,
  isSameMonth
} from "date-fns";

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

interface CalendarGridProps {
  year: number;
  month: number;
  availabilitiesByDate: Record<string, Availability[]>;
  isLoading: boolean;
  onAvailabilityClick: (availability: Availability) => void;
  role: "embasa" | "sac";
}

export default function CalendarGrid({
  year,
  month,
  availabilitiesByDate,
  isLoading,
  onAvailabilityClick,
  role
}: CalendarGridProps) {
  // Generate calendar days
  const startDate = startOfMonth(new Date(year, month - 1));
  const endDate = endOfMonth(startDate);
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  // Calculate leading empty cells based on day of week
  const startDayOfWeek = getDay(startDate);
  const leadingEmptyCells = Array.from({ length: startDayOfWeek }, (_, i) => i);
  
  // Calculate trailing empty cells to complete the grid (if needed)
  const totalCells = leadingEmptyCells.length + days.length;
  const trailingEmptyCellsCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  const trailingEmptyCells = Array.from({ length: trailingEmptyCellsCount }, (_, i) => i);
  
  // Helper to get classes for day cell based on availability
  const getDayClass = (date: Date, hasAvailability: boolean) => {
    let baseClass = "border rounded-md p-2 h-24 overflow-y-auto";
    
    if (!isSameMonth(date, new Date(year, month - 1))) {
      return `${baseClass} opacity-50`;
    }
    
    if (hasAvailability) {
      baseClass += " calendar-day available cursor-pointer";
      if (role === "embasa") {
        baseClass += " hover:bg-blue-50";
      } else if (role === "sac") {
        baseClass += " hover:bg-green-50";
      }
    }
    
    return baseClass;
  };
  
  // Helper to get time slot style based on role
  const getTimeSlotClass = () => {
    if (role === "embasa") {
      return "bg-blue-100 text-blue-600 text-xs p-1 rounded mb-1";
    } else if (role === "sac") {
      return "bg-green-100 text-green-700 text-xs p-1 rounded mb-1";
    }
    return "";
  };
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-7 gap-2">
        {/* Day headers */}
        <div className="text-center font-medium text-neutral-600 text-sm">Dom</div>
        <div className="text-center font-medium text-neutral-600 text-sm">Seg</div>
        <div className="text-center font-medium text-neutral-600 text-sm">Ter</div>
        <div className="text-center font-medium text-neutral-600 text-sm">Qua</div>
        <div className="text-center font-medium text-neutral-600 text-sm">Qui</div>
        <div className="text-center font-medium text-neutral-600 text-sm">Sex</div>
        <div className="text-center font-medium text-neutral-600 text-sm">Sáb</div>
        
        {/* Loading placeholder */}
        {Array.from({ length: 35 }, (_, i) => (
          <div 
            key={`loading-${i}`} 
            className="border rounded-md p-2 h-24 animate-pulse bg-gray-100"
          ></div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-7 gap-2">
      {/* Day headers */}
      <div className="text-center font-medium text-neutral-600 text-sm">Dom</div>
      <div className="text-center font-medium text-neutral-600 text-sm">Seg</div>
      <div className="text-center font-medium text-neutral-600 text-sm">Ter</div>
      <div className="text-center font-medium text-neutral-600 text-sm">Qua</div>
      <div className="text-center font-medium text-neutral-600 text-sm">Qui</div>
      <div className="text-center font-medium text-neutral-600 text-sm">Sex</div>
      <div className="text-center font-medium text-neutral-600 text-sm">Sáb</div>
      
      {/* Leading empty cells */}
      {leadingEmptyCells.map((_, index) => (
        <div 
          key={`leading-empty-${index}`} 
          className="border rounded-md p-2 h-24 opacity-50"
        ></div>
      ))}
      
      {/* Calendar days */}
      {days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const availabilities = availabilitiesByDate[dateStr] || [];
        const hasAvailability = availabilities.length > 0;
        
        return (
          <div
            key={dateStr}
            className={getDayClass(day, hasAvailability)}
            onClick={() => {
              if (hasAvailability && availabilities[0]) {
                onAvailabilityClick(availabilities[0]);
              }
            }}
          >
            <div className="text-right text-sm text-neutral-600 mb-1">
              {format(day, 'd')}
            </div>
            
            {availabilities.map((avail) => (
              <div 
                key={avail.id}
                className={getTimeSlotClass()}
                onClick={(e) => {
                  e.stopPropagation();
                  onAvailabilityClick(avail);
                }}
              >
                {avail.startTime} - {avail.endTime}
                {role === "sac" && avail.remainingSlots <= 0 && (
                  <span className="ml-1 text-red-500">(Esgotado)</span>
                )}
              </div>
            ))}
          </div>
        );
      })}
      
      {/* Trailing empty cells */}
      {trailingEmptyCells.map((_, index) => (
        <div 
          key={`trailing-empty-${index}`} 
          className="border rounded-md p-2 h-24 opacity-50"
        ></div>
      ))}
    </div>
  );
}
