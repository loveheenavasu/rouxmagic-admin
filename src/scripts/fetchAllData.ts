import { supabase } from '../lib/supabase';

async function fetchAllData() {
  console.log('🔍 Fetching all data from Supabase projects table...\n');
  
  const { data, error } = await supabase
    .from('projects')
    .select('*');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Found ${data?.length || 0} records\n`);
  
  // Display all data
  console.log('📊 All Records:');
  console.log(JSON.stringify(data, null, 2));
  
  // Analyze content types
  const contentTypes = new Set(data?.map(item => item.content_type) || []);
  console.log('\n📋 Unique Content Types:');
  contentTypes.forEach(type => console.log(`  - ${type}`));
  
  // Show all unique fields
  const allFields = new Set<string>();
  data?.forEach(item => {
    Object.keys(item).forEach(key => allFields.add(key));
  });
  
  console.log('\n🔑 All Fields in Database:');
  Array.from(allFields).sort().forEach(field => console.log(`  - ${field}`));
}

fetchAllData();
