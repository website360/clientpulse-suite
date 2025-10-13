-- Criar tabela de tarefas
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  assigned_to UUID REFERENCES public.profiles(id),
  due_date TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  client_id UUID REFERENCES public.clients(id),
  ticket_id UUID REFERENCES public.tickets(id),
  google_event_id TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela para tokens do Google Calendar
CREATE TABLE public.google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  calendar_id TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  sync_tickets BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tasks
CREATE POLICY "Admins can manage all tasks"
  ON public.tasks
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their assigned tasks"
  ON public.tasks
  FOR SELECT
  USING (
    assigned_to = auth.uid() 
    OR created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can create tasks"
  ON public.tasks
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'client'))
  );

CREATE POLICY "Users can update their tasks"
  ON public.tasks
  FOR UPDATE
  USING (
    assigned_to = auth.uid() 
    OR created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can delete their tasks"
  ON public.tasks
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
  );

-- Políticas RLS para google_calendar_tokens
CREATE POLICY "Users can manage their own tokens"
  ON public.google_calendar_tokens
  FOR ALL
  USING (user_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_google_calendar_tokens_updated_at
  BEFORE UPDATE ON public.google_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_tasks_client_id ON public.tasks(client_id);
CREATE INDEX idx_tasks_ticket_id ON public.tasks(ticket_id);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_google_event_id ON public.tasks(google_event_id);
CREATE INDEX idx_google_calendar_tokens_user_id ON public.google_calendar_tokens(user_id);