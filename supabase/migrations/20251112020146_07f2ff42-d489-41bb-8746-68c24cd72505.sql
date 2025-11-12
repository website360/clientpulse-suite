-- Comentários em etapas de projeto
CREATE TABLE IF NOT EXISTS public.project_stage_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_stage_id UUID NOT NULL REFERENCES public.project_stages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_comment_id UUID REFERENCES public.project_stage_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false
);

CREATE INDEX idx_project_stage_comments_stage ON public.project_stage_comments(project_stage_id);
CREATE INDEX idx_project_stage_comments_user ON public.project_stage_comments(user_id);

-- Menções em comentários
CREATE TABLE IF NOT EXISTS public.project_comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.project_stage_comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_comment_mentions_user ON public.project_comment_mentions(mentioned_user_id);

-- Dependências entre checklist items
ALTER TABLE public.project_checklist_items
ADD COLUMN IF NOT EXISTS depends_on_item_id UUID REFERENCES public.project_checklist_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_checklist_dependency ON public.project_checklist_items(depends_on_item_id);

-- Anexos por etapa
CREATE TABLE IF NOT EXISTS public.project_stage_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_stage_id UUID NOT NULL REFERENCES public.project_stages(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  description TEXT
);

CREATE INDEX idx_stage_attachments_stage ON public.project_stage_attachments(project_stage_id);

-- Aprovações de cliente
CREATE TABLE IF NOT EXISTS public.project_stage_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_stage_id UUID NOT NULL REFERENCES public.project_stages(id) ON DELETE CASCADE,
  approval_token UUID DEFAULT gen_random_uuid() UNIQUE,
  requested_by UUID NOT NULL,
  approved_by_name TEXT,
  approved_by_email TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  signature_data TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  client_message TEXT
);

CREATE INDEX idx_stage_approvals_stage ON public.project_stage_approvals(project_stage_id);
CREATE INDEX idx_stage_approvals_token ON public.project_stage_approvals(approval_token);

-- Histórico de mudanças solicitadas
CREATE TABLE IF NOT EXISTS public.project_approval_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_id UUID NOT NULL REFERENCES public.project_stage_approvals(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  change_description TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID
);

CREATE INDEX idx_approval_changes_approval ON public.project_approval_changes(approval_id);

-- RLS Policies para comentários
ALTER TABLE public.project_stage_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all comments"
  ON public.project_stage_comments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view comments of their projects"
  ON public.project_stage_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_stages ps
      JOIN public.projects p ON p.id = ps.project_id
      WHERE ps.id = project_stage_comments.project_stage_id
        AND (p.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
    OR NOT is_internal
  );

CREATE POLICY "Users can create comments on their projects"
  ON public.project_stage_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_stages ps
      JOIN public.projects p ON p.id = ps.project_id
      WHERE ps.id = project_stage_comments.project_stage_id
        AND (p.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own comments"
  ON public.project_stage_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON public.project_stage_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies para menções
ALTER TABLE public.project_comment_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view mentions that reference them"
  ON public.project_comment_mentions FOR SELECT
  TO authenticated
  USING (
    mentioned_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.project_stage_comments psc
      WHERE psc.id = project_comment_mentions.comment_id
        AND (psc.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can create mentions in their comments"
  ON public.project_comment_mentions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_stage_comments psc
      WHERE psc.id = project_comment_mentions.comment_id
        AND psc.user_id = auth.uid()
    )
  );

-- RLS Policies para anexos
ALTER TABLE public.project_stage_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all attachments"
  ON public.project_stage_attachments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view attachments of their projects"
  ON public.project_stage_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_stages ps
      JOIN public.projects p ON p.id = ps.project_id
      WHERE ps.id = project_stage_attachments.project_stage_id
        AND (p.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Users can upload attachments to their projects"
  ON public.project_stage_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_stages ps
      JOIN public.projects p ON p.id = ps.project_id
      WHERE ps.id = project_stage_attachments.project_stage_id
        AND (p.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
    AND uploaded_by = auth.uid()
  );

-- RLS Policies para aprovações (acesso público com token)
ALTER TABLE public.project_stage_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all approvals"
  ON public.project_stage_approvals FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view approvals with token"
  ON public.project_stage_approvals FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can update approvals with valid token"
  ON public.project_stage_approvals FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can create approvals for their projects"
  ON public.project_stage_approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_stages ps
      JOIN public.projects p ON p.id = ps.project_id
      WHERE ps.id = project_stage_approvals.project_stage_id
        AND (p.created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
    AND requested_by = auth.uid()
  );

-- RLS Policies para histórico de mudanças
ALTER TABLE public.project_approval_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approval changes"
  ON public.project_approval_changes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can create approval changes"
  ON public.project_approval_changes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can resolve changes"
  ON public.project_approval_changes FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Triggers
CREATE TRIGGER update_project_stage_comments_updated_at
  BEFORE UPDATE ON public.project_stage_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_stage_approvals_updated_at
  BEFORE UPDATE ON public.project_stage_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para notificar menções
CREATE OR REPLACE FUNCTION public.notify_comment_mentions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mention_record RECORD;
  v_project_name TEXT;
  v_stage_name TEXT;
  v_commenter_name TEXT;
BEGIN
  -- Buscar informações do projeto e etapa
  SELECT p.name, ps.name, pr.full_name
  INTO v_project_name, v_stage_name, v_commenter_name
  FROM project_stage_comments psc
  JOIN project_stages ps ON ps.id = psc.project_stage_id
  JOIN projects p ON p.id = ps.project_id
  JOIN profiles pr ON pr.id = psc.user_id
  WHERE psc.id = NEW.comment_id;

  -- Buscar dados do usuário mencionado
  SELECT p.email, p.phone
  INTO v_mention_record
  FROM profiles p
  WHERE p.id = NEW.mentioned_user_id;

  -- Enviar notificação
  PERFORM notify_event(
    'project_mention',
    jsonb_build_object(
      'project_name', v_project_name,
      'stage_name', v_stage_name,
      'commenter_name', v_commenter_name,
      'mentioned_email', v_mention_record.email,
      'mentioned_phone', v_mention_record.phone,
      'comment_preview', LEFT((SELECT comment FROM project_stage_comments WHERE id = NEW.comment_id), 100),
      'project_url', 'https://sistema.com/projects/' || (SELECT project_id FROM project_stages WHERE id = (SELECT project_stage_id FROM project_stage_comments WHERE id = NEW.comment_id))
    ),
    'project',
    (SELECT project_id FROM project_stages WHERE id = (SELECT project_stage_id FROM project_stage_comments WHERE id = NEW.comment_id))
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_mention
  AFTER INSERT ON public.project_comment_mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_comment_mentions();

-- Função para notificar aprovação pendente
CREATE OR REPLACE FUNCTION public.notify_approval_requested()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project_name TEXT;
  v_stage_name TEXT;
  v_client_email TEXT;
  v_client_phone TEXT;
BEGIN
  -- Buscar informações
  SELECT 
    p.name,
    ps.name,
    c.email,
    c.phone
  INTO v_project_name, v_stage_name, v_client_email, v_client_phone
  FROM project_stages ps
  JOIN projects pr ON pr.id = ps.project_id
  JOIN clients c ON c.id = pr.client_id
  WHERE ps.id = NEW.project_stage_id;

  -- Enviar notificação
  PERFORM notify_event(
    'project_approval_requested',
    jsonb_build_object(
      'project_name', v_project_name,
      'stage_name', v_stage_name,
      'client_email', v_client_email,
      'client_phone', v_client_phone,
      'approval_url', 'https://sistema.com/approval/' || NEW.approval_token,
      'notes', COALESCE(NEW.notes, '')
    ),
    'project',
    (SELECT project_id FROM project_stages WHERE id = NEW.project_stage_id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_approval
  AFTER INSERT ON public.project_stage_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_approval_requested();