import { Calendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import "moment/locale/pt-br";

moment.locale("pt-br");
const localizer = momentLocalizer(moment);

interface TaskCalendarProps {
  tasks: any[];
  onEditTask: (task: any) => void;
  onRefetch: () => void;
}

const TaskCalendar = ({ tasks, onEditTask, onRefetch }: TaskCalendarProps) => {
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());

  const { data: tickets = [] } = useQuery({
    queryKey: ["tickets-calendar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*, client:clients(id, full_name, nickname, company_name)")
        .neq("status", "closed");
      if (error) throw error;
      return data;
    },
  });

  const taskEvents = tasks.map((task) => {
    const start = task.start_time
      ? new Date(task.start_time)
      : task.due_date
      ? new Date(task.due_date)
      : new Date();
    const end = task.end_time
      ? new Date(task.end_time)
      : task.due_date
      ? new Date(task.due_date)
      : new Date();

    return {
      id: task.id,
      title: task.title,
      start,
      end,
      resource: { type: "task", data: task },
    };
  });

  const ticketEvents = tickets.map((ticket) => {
    const date = ticket.created_at;
    const start = new Date(date);
    const end = new Date(date);

    return {
      id: ticket.id,
      title: `#${ticket.ticket_number} - ${ticket.subject}`,
      start,
      end,
      resource: { type: "ticket", data: ticket },
    };
  });

  const allEvents = [...taskEvents, ...ticketEvents];

  const eventStyleGetter = (event: any) => {
    const { type, data } = event.resource;
    
    let backgroundColor = "#3b82f6";
    
    if (type === "task") {
      if (data.google_event_id) {
        backgroundColor = "#10b981";
      } else {
        backgroundColor = "#3b82f6";
      }
    } else if (type === "ticket") {
      switch (data.priority) {
        case "high":
          backgroundColor = "#f97316";
          break;
        case "medium":
          backgroundColor = "#fb923c";
          break;
        case "low":
          backgroundColor = "#fdba74";
          break;
        default:
          backgroundColor = "#fb923c";
      }
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  const handleSelectEvent = (event: any) => {
    if (event.resource.type === "task") {
      onEditTask(event.resource.data);
    } else {
      window.location.href = `/tickets/${event.resource.data.id}`;
    }
  };

  const handleSelectSlot = ({ start }: { start: Date; end: Date }) => {
    const newTask = {
      start_time: start,
      end_time: new Date(start.getTime() + 60 * 60 * 1000),
    };
    onEditTask(newTask);
  };

  return (
    <div className="h-[600px] bg-card rounded-lg border p-4">
      <Calendar
        localizer={localizer}
        events={allEvents}
        startAccessor="start"
        endAccessor="end"
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        eventPropGetter={eventStyleGetter}
        messages={{
          next: "Próximo",
          previous: "Anterior",
          today: "Hoje",
          month: "Mês",
          week: "Semana",
          day: "Dia",
          agenda: "Agenda",
          date: "Data",
          time: "Hora",
          event: "Evento",
          noEventsInRange: "Não há eventos neste período",
          showMore: (total) => `+ ${total} mais`,
        }}
        formats={{
          dayHeaderFormat: (date) => moment(date).format("dddd, DD/MM"),
          monthHeaderFormat: (date) => moment(date).format("MMMM YYYY"),
          dayRangeHeaderFormat: ({ start, end }) =>
            `${moment(start).format("DD/MM")} - ${moment(end).format("DD/MM")}`,
          agendaHeaderFormat: ({ start, end }) =>
            `${moment(start).format("DD/MM")} - ${moment(end).format("DD/MM")}`,
        }}
      />
    </div>
  );
};

export default TaskCalendar;
