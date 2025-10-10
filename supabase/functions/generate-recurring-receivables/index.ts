import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Receivable {
  id: string;
  client_id: string;
  description: string;
  category: string;
  amount: number;
  due_date: string;
  occurrence_type: string;
  due_day: number | null;
  issue_date: string;
  created_by: string;
  payment_method: string | null;
  invoice_number: string | null;
  notes: string | null;
  status: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting recurring receivables generation...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date
    const now = new Date();
    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    // Find recurring receivables where the last charge expires within a month
    const { data: existingReceivables, error: fetchError } = await supabase
      .from('accounts_receivable')
      .select('*')
      .in('occurrence_type', ['mensal', 'trimestral', 'semestral', 'anual'])
      .eq('status', 'pending')
      .order('due_date', { ascending: false });

    if (fetchError) {
      console.error('Error fetching receivables:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${existingReceivables?.length || 0} recurring receivables`);

    // Group by client_id, description, category, occurrence_type
    const grouped = new Map<string, Receivable[]>();
    
    existingReceivables?.forEach((receivable) => {
      const key = `${receivable.client_id}-${receivable.description}-${receivable.category}-${receivable.occurrence_type}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(receivable as Receivable);
    });

    let totalGenerated = 0;
    const newCharges: any[] = [];

    // For each group, check if we need to generate new charges
    for (const [key, receivables] of grouped.entries()) {
      // Get the latest charge
      const latestCharge = receivables[0]; // Already sorted by due_date desc
      const latestDueDate = new Date(latestCharge.due_date);

      console.log(`Checking group ${key}, latest due date: ${latestDueDate.toISOString()}`);

      // If the latest charge expires within a month, generate 12 more
      if (latestDueDate <= oneMonthFromNow) {
        console.log(`Generating new charges for group ${key}`);

        const monthsIncrement = latestCharge.occurrence_type === 'mensal' ? 1 :
                                latestCharge.occurrence_type === 'trimestral' ? 3 :
                                latestCharge.occurrence_type === 'semestral' ? 6 : 12;

        for (let i = 1; i <= 12; i++) {
          const dueDate = new Date(latestDueDate);
          dueDate.setMonth(dueDate.getMonth() + (i * monthsIncrement));
          if (latestCharge.due_day) {
            dueDate.setDate(latestCharge.due_day);
          }

          newCharges.push({
            client_id: latestCharge.client_id,
            description: latestCharge.description,
            category: latestCharge.category,
            amount: latestCharge.amount,
            due_date: dueDate.toISOString().split('T')[0],
            occurrence_type: latestCharge.occurrence_type,
            due_day: latestCharge.due_day,
            issue_date: now.toISOString().split('T')[0],
            created_by: latestCharge.created_by,
            payment_method: latestCharge.payment_method,
            invoice_number: latestCharge.invoice_number,
            notes: latestCharge.notes,
            status: 'pending',
          });
          totalGenerated++;
        }
      }
    }

    // Insert new charges
    if (newCharges.length > 0) {
      console.log(`Inserting ${newCharges.length} new charges...`);
      const { error: insertError } = await supabase
        .from('accounts_receivable')
        .insert(newCharges);

      if (insertError) {
        console.error('Error inserting charges:', insertError);
        throw insertError;
      }
    }

    console.log(`Successfully generated ${totalGenerated} new recurring receivables`);

    return new Response(
      JSON.stringify({
        success: true,
        generated: totalGenerated,
        message: `Generated ${totalGenerated} recurring receivables`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in generate-recurring-receivables:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
