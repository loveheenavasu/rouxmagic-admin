//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

//@ts-ignore
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch all users from auth.users
    const { data: users, error: usersError } = await supabaseClient.auth.admin.listUsers()

    if (usersError) {
      throw usersError
    }

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('*')

    if (profilesError) {
      throw profilesError
    }

    // Fetch all plans
    const { data: plans, error: plansError } = await supabaseClient
      .from('plans')
      .select('*')

    if (plansError) {
      throw plansError
    }

    // Merge users and profiles, picking only necessary fields
    //@ts-ignore
    const mergedUsers = users.users.map((user) => {
      //@ts-ignore
      const profile = profiles.find((p) => p.user_id === user.id)
      //@ts-ignore
      const plan = plans.find((pl) => pl.stripe_product_id === profile?.tier) || null
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_active_at: user.last_sign_in_at,
        profile: profile ? { ...profile, plan } : null,
      }
    })

    return new Response(JSON.stringify({ users: mergedUsers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    //@ts-ignore
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
