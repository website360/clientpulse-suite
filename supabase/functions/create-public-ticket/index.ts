import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    console.log('Received public ticket request:', { ...body, email: body.email.substring(0, 5) + '***', attachments: body.attachments?.length || 0 })

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

    // Try to find existing client by email
    let clientId: string | null = null

    // First, check clients table
    const { data: clientByEmail } = await supabase
      .from('clients')
      .select('id')
      .ilike('email', email)
      .maybeSingle()

    if (clientByEmail) {
      clientId = clientByEmail.id
      console.log('Found client by email:', clientId)
    } else {
      // Check client_contacts table
      const { data: contactByEmail } = await supabase
        .from('client_contacts')
        .select('client_id')
        .ilike('email', email)
        .maybeSingle()

      if (contactByEmail) {
        clientId = contactByEmail.client_id
        console.log('Found client via contact email:', clientId)
      }
    }

    // Generate ticket number
    const { data: lastTicket } = await supabase
      .from('tickets')
      .select('ticket_number')
      .order('ticket_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextTicketNumber = (lastTicket?.ticket_number || 0) + 1

    // Create the ticket
    const ticketData: any = {
      ticket_number: nextTicketNumber,
      department_id,
      priority: priority || 'medium',
      subject,
      description,
      status: 'waiting',
    }

    if (clientId) {
      // Client found - link ticket to client
      ticketData.client_id = clientId
      ticketData.requester_name = null
      ticketData.requester_email = null
      ticketData.requester_phone = null
    } else {
      // No client found - store requester info in ticket
      ticketData.client_id = null
      ticketData.requester_name = name
      ticketData.requester_email = email
      ticketData.requester_phone = phone
    }

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert(ticketData)
      .select('id, ticket_number')
      .single()

    if (ticketError) {
      console.error('Error creating ticket:', ticketError)
      return new Response(
        JSON.stringify({ error: 'Erro ao criar ticket: ' + ticketError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Ticket created successfully:', ticket)

    // Upload attachments if provided
    const uploadedAttachments: string[] = []
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        try {
          // Remove data URL prefix if present
          const base64Data = attachment.data.includes('base64,') 
            ? attachment.data.split('base64,')[1] 
            : attachment.data
          
          // Convert base64 to Uint8Array
          const binaryString = atob(base64Data)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }

          // Generate unique filename
          const fileExt = attachment.name.split('.').pop() || 'bin'
          const fileName = `${ticket.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('ticket-attachments')
            .upload(fileName, bytes, {
              contentType: attachment.type,
              upsert: false
            })

          if (uploadError) {
            console.error('Error uploading attachment:', uploadError)
          } else {
            // Get public URL
            const { data: urlData } = supabase.storage
              .from('ticket-attachments')
              .getPublicUrl(fileName)
            
            uploadedAttachments.push(urlData.publicUrl)
            console.log('Attachment uploaded:', fileName)
          }
        } catch (uploadErr) {
          console.error('Error processing attachment:', uploadErr)
        }
      }

      // Add attachments to initial ticket message
      if (uploadedAttachments.length > 0) {
        await supabase.from('ticket_messages').insert({
          ticket_id: ticket.id,
          message: `Anexos enviados pelo formulário público`,
          is_internal: false,
          attachments: uploadedAttachments,
        })
        console.log('Initial message with attachments created')
      }
    }

    // Notify admins about new public ticket
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')

    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.user_id,
        title: `Novo ticket público #${ticket.ticket_number}`,
        description: `${clientId ? 'Cliente identificado' : 'Solicitante: ' + name} - ${subject}`,
        type: 'info',
        reference_type: 'ticket',
        reference_id: ticket.id,
      }))

      await supabase.from('notifications').insert(notifications)
      console.log('Admin notifications sent')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        ticket_number: ticket.ticket_number,
        ticket_id: ticket.id,
        client_found: !!clientId,
        attachments_uploaded: uploadedAttachments.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
