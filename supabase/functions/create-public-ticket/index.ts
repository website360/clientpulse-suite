import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createTicketFromRequester } from '../_shared/createTicket.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Attachment {
  name: string
  type: string
  size: number
  data: string // base64
}

interface PublicTicketRequest {
  name: string
  email: string
  phone: string
  department_id: string
  priority: string
  subject: string
  description: string
  attachments?: Attachment[]
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: PublicTicketRequest = await req.json()
    console.log('Received public ticket request:', { ...body, email: body.email?.substring(0, 5) + '***', attachments: body.attachments?.length || 0 })

    const { name, email, phone, department_id, priority, subject, description, attachments } = body

    // Validate required fields
    if (!name || !email || !phone || !department_id || !subject || !description) {
      return new Response(
        JSON.stringify({ error: 'Todos os campos obrigatórios devem ser preenchidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = await createTicketFromRequester(supabase, supabaseUrl, {
      name,
      email,
      phone,
      department_id,
      priority,
      subject,
      description,
      attachments,
      source: 'public',
    })

    console.log('Ticket created successfully:', result)

    return new Response(
      JSON.stringify({
        success: true,
        ticket_number: result.ticket_number,
        ticket_id: result.ticket_id,
        client_found: result.client_found,
        attachments_uploaded: result.attachments_uploaded,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error)?.message || 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
