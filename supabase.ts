import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wvmwxkuucjwvjcxvzcho.supabase.co';
const supabaseKey = 'sb_publishable_cpfwHI8LoaE3jZr_Enrf6w_uT_f3y50';

export const supabase = createClient(supabaseUrl, supabaseKey);