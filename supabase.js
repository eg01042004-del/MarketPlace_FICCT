import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = "https://uexvdjnyrhuuhxidbmeh.supabase.co";

const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleHZkam55cmh1dWh4aWRibWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3OTQ3NzMsImV4cCI6MjA5NzM3MDc3M30.CBH7q6xNuYFBuK8Ej1I5qwcXxLcC7fm0Jit4dl2_dSM";

console.log("SUPABASE URL:", supabaseUrl);


export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);
