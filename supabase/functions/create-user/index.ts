//@ts-ignore
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

enum Role {
  User = 'user',
  Admin = 'admin',
}

enum Tier {
  Free = 'Free',
  AllAccess = 'All_Access',
  AdFree = 'Ad_Free',
}

//@ts-ignore
serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      //@ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      //@ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { email, password, role, is_verified } = body

    // Validate required fields
    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate role enum
    if (!Object.values(Role).includes(role as Role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${Object.values(Role).join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Create user in Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: !!is_verified,
    })

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: authError?.message || 'Failed to create user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id
    const now = new Date().toISOString()

    // 2. Insert into profiles table
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      created_at: now,
      user_id: userId,
      stripe_customer_id: '',
      tier: Tier.Free,
      updated_at: now,
      role: role,
    })

    if (profileError) {
      return new Response(
        JSON.stringify({ error: 'User created, but failed to create profile: ' + profileError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ message: 'User created successfully', user_id: userId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    //@ts-ignore
    return new Response(
      //@ts-ignore
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
