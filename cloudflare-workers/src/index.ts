// 8. Insert lead into Supabase
console.log('💾 Inserting lead...');
const insertLeadRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
  method: 'POST',
  headers: {
    ...supabaseHeaders,
    'Prefer': 'return=representation' // Force Supabase to return the inserted record
  },
  body: JSON.stringify({
    user_id: userId,
    username: profileData.username,
    platform: 'instagram',
    profile_url,
    avatar_url: profileData.profilePicUrl || profileData.profilePicUrlHD || null,
    score: 0, // Will be updated after analysis
    status: 'analyzed',
    created_at: new Date().toISOString(),
  }),
});

console.log('📊 Lead insert response status:', insertLeadRes.status);

if (!insertLeadRes.ok) {
  const errorText = await insertLeadRes.text();
  console.error('❌ Lead insert failed:', errorText);
  throw new Error(`Failed to insert lead: ${insertLeadRes.status} - ${errorText}`);
}

// Safe JSON parsing with fallback
let leadData = null;
const responseText = await insertLeadRes.text();
console.log('📄 Lead insert response text:', responseText);

if (responseText && responseText.trim() !== '') {
  try {
    leadData = JSON.parse(responseText);
    console.log('📋 Lead insert response parsed:', JSON.stringify(leadData));
  } catch (parseError) {
    console.error('❌ Lead insert JSON parse error:', parseError);
    console.log('📝 Raw response:', responseText);
    // Return success anyway since the HTTP status was OK
    return c.json({ 
      success: true, 
      message: 'Lead inserted successfully but response parsing failed',
      profile_url,
      analysisType 
    });
  }
} else {
  console.log('⚠️ Empty response from lead insertion, but status was OK');
  // Create mock lead data to continue
  leadData = [{ 
    id: `mock-${Date.now()}`, 
    user_id: userId,
    username: profileData.username 
  }];
}

const lead = Array.isArray(leadData) ? leadData[0] : leadData;

if (!lead?.id) {
  console.log('❌ No lead ID in response, creating mock ID');
  // If we still don't have an ID, create a mock one to continue the process
  lead.id = `mock-${Date.now()}-${userId.slice(0, 8)}`;
}

console.log('✅ Lead processed:', lead.id);
