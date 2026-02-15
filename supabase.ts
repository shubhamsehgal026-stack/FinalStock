import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wvmwxkuucjwvjcxvzcho.supabase.co';
const supabaseKey = 'sb_publishable_Q2UEv3eri5Aiq1eX8-PUvw_cSzLRNP7';

export const supabase = createClient(supabaseUrl, supabaseKey);