import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Test query
    const { data, error } = await supabase
      .from('indicators')
      .select('count')
      .limit(1);
    
    if (error) {
      return NextResponse.json({ 
        status: 'error', 
        message: error.message,
        code: error.code
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      status: 'ok',
      supabase_connected: true,
      env_vars_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      status: 'error', 
      message 
    }, { status: 500 });
  }
}
