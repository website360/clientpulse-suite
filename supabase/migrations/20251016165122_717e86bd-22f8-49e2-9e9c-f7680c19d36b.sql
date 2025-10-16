-- Criar tabela de itens do checklist de manutenção
CREATE TABLE public.maintenance_checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.maintenance_checklist_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage checklist items"
ON public.maintenance_checklist_items
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active checklist items"
ON public.maintenance_checklist_items
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_maintenance_checklist_items_updated_at
BEFORE UPDATE ON public.maintenance_checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela de planos de manutenção dos clientes
CREATE TABLE public.client_maintenance_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  monthly_day INTEGER NOT NULL DEFAULT 1 CHECK (monthly_day >= 1 AND monthly_day <= 31),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.client_maintenance_plans ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage all maintenance plans"
ON public.client_maintenance_plans
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their own maintenance plans"
ON public.client_maintenance_plans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = client_maintenance_plans.client_id
    AND (clients.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_client_maintenance_plans_updated_at
BEFORE UPDATE ON public.client_maintenance_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela de execuções de manutenção
CREATE TABLE public.maintenance_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_plan_id UUID NOT NULL REFERENCES public.client_maintenance_plans(id) ON DELETE CASCADE,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_by UUID NOT NULL,
  next_scheduled_date DATE,
  whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.maintenance_executions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage all maintenance executions"
ON public.maintenance_executions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their own maintenance executions"
ON public.maintenance_executions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_maintenance_plans cmp
    JOIN public.clients c ON c.id = cmp.client_id
    WHERE cmp.id = maintenance_executions.maintenance_plan_id
    AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_maintenance_executions_updated_at
BEFORE UPDATE ON public.maintenance_executions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar enum para status dos itens da execução
CREATE TYPE public.maintenance_item_status AS ENUM ('done', 'not_needed', 'skipped');

-- Criar tabela de itens da execução de manutenção
CREATE TABLE public.maintenance_execution_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_execution_id UUID NOT NULL REFERENCES public.maintenance_executions(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES public.maintenance_checklist_items(id) ON DELETE CASCADE,
  status public.maintenance_item_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.maintenance_execution_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage all maintenance execution items"
ON public.maintenance_execution_items
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their own maintenance execution items"
ON public.maintenance_execution_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.maintenance_executions me
    JOIN public.client_maintenance_plans cmp ON cmp.id = me.maintenance_plan_id
    JOIN public.clients c ON c.id = cmp.client_id
    WHERE me.id = maintenance_execution_items.maintenance_execution_id
    AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_maintenance_execution_items_updated_at
BEFORE UPDATE ON public.maintenance_execution_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela de configurações de manutenção
CREATE TABLE public.maintenance_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_template TEXT NOT NULL DEFAULT '🤖 [Mensagem Automática]

Olá, {cliente_nome} Tudo bem?

Gostaríamos de informar que foi realizado uma manutenção preventiva no site ({site_url}), desde já informamos que ela foi concluída sem contratempos, garantindo que o site continue atualizado e seguro.

Durante o processo, nossa equipe técnica dedicou-se a identificar e corrigir qualquer possível inconformidade, assegurando a estabilidade e o desempenho adequado de todas as funcionalidades.

{checklist}

Atenciosamente
{assinatura}',
  default_monthly_day INTEGER NOT NULL DEFAULT 1 CHECK (default_monthly_day >= 1 AND default_monthly_day <= 31),
  notification_days_advance INTEGER NOT NULL DEFAULT 3,
  message_signature TEXT NOT NULL DEFAULT 'Agência May 💛',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.maintenance_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage maintenance settings"
ON public.maintenance_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_maintenance_settings_updated_at
BEFORE UPDATE ON public.maintenance_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir registro inicial de configurações
INSERT INTO public.maintenance_settings (id) VALUES (gen_random_uuid());

-- Inserir itens padrão do checklist
INSERT INTO public.maintenance_checklist_items (name, "order") VALUES
  ('Atualização Site', 1),
  ('Atualização Plugins', 2),
  ('Atualização Tema', 3),
  ('Backup', 4),
  ('Renovação das Licenças Pro', 5),
  ('Correções pré atualização', 6),
  ('Correções pós atualização', 7),
  ('Instalações', 8),
  ('Configurações', 9),
  ('Melhoria na performance', 10),
  ('Melhoria na segurança', 11);