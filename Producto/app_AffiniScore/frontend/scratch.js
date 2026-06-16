const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://fojvwsegibjssttbzghe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvanZ3c2VnaWJqc3N0dGJ6Z2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NDEyNzAsImV4cCI6MjA5MTUxNzI3MH0.U5zTiaKAIfmMfpeEGOHsE-ZGI4_3EJmpdPVVozRq48o';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('user_disconnect_challenges').select('*').limit(5);
  console.log("Disconnect Challenges:", data, error);
}

main();
