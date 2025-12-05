-- Allow public access to active departments (for public ticket form)
CREATE POLICY "Public can view active departments" 
ON public.departments 
FOR SELECT 
USING (is_active = true);