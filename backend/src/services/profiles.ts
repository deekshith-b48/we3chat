import { supabaseAdmin, type Profile } from './supabase.js';

export async function upsertProfileByWallet(wallet: string, patch: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      { 
        wallet_address: wallet.toLowerCase(), 
        updated_at: new Date().toISOString(),
        ...patch 
      }, 
      { onConflict: 'wallet_address' }
    )
    .select()
    .single();
    
  if (error) throw new Error(`Failed to upsert profile by wallet: ${error.message}`);
  return data;
}

export async function upsertProfileByEmail(email: string, patch: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      { 
        email: email.toLowerCase(), 
        updated_at: new Date().toISOString(),
        ...patch 
      }, 
      { onConflict: 'email' }
    )
    .select()
    .single();
    
  if (error) throw new Error(`Failed to upsert profile by email: ${error.message}`);
  return data;
}

export async function getProfileByWallet(wallet: string): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('wallet_address', wallet.toLowerCase())
    .maybeSingle();
    
  if (error) throw new Error(`Failed to get profile by wallet: ${error.message}`);
  return data;
}

export async function getProfileByEmail(email: string): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('email', email.toLowerCase())
    .maybeSingle();
    
  if (error) throw new Error(`Failed to get profile by email: ${error.message}`);
  return data;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();
    
  if (error) throw new Error(`Failed to get profile by ID: ${error.message}`);
  return data;
}

export async function updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw new Error(`Failed to update profile: ${error.message}`);
  return data;
}

export async function searchProfiles(query: string, limit = 10): Promise<Profile[]> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .or(`username.ilike.%${query}%,email.ilike.%${query}%,wallet_address.ilike.%${query}%`)
    .limit(limit);
    
  if (error) throw new Error(`Failed to search profiles: ${error.message}`);
  return data || [];
}

export async function getFriends(userId: string): Promise<Profile[]> {
  const { data, error } = await supabaseAdmin
    .from('friendships')
    .select(`
      *,
      requester:profiles!friendships_requester_id_fkey(*),
      addressee:profiles!friendships_addressee_id_fkey(*)
    `)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted');
    
  if (error) throw new Error(`Failed to get friends: ${error.message}`);
  
  // Extract friend profiles from the friendship data
  const friends: Profile[] = [];
  data?.forEach(friendship => {
    if (friendship.requester_id === userId && friendship.addressee) {
      friends.push(friendship.addressee);
    } else if (friendship.addressee_id === userId && friendship.requester) {
      friends.push(friendship.requester);
    }
  });
  
  return friends;
}

export async function createFriendship(requesterId: string, addresseeId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('friendships')
    .insert({
      requester_id: requesterId,
      addressee_id: addresseeId,
      status: 'pending'
    });
    
  if (error) throw new Error(`Failed to create friendship: ${error.message}`);
}

export async function updateFriendshipStatus(
  friendshipId: string, 
  status: 'accepted' | 'declined' | 'blocked'
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('friendships')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', friendshipId);
    
  if (error) throw new Error(`Failed to update friendship status: ${error.message}`);
}

export async function getFriendshipStatus(userId1: string, userId2: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('friendships')
    .select('status')
    .or(`and(requester_id.eq.${userId1},addressee_id.eq.${userId2}),and(requester_id.eq.${userId2},addressee_id.eq.${userId1})`)
    .maybeSingle();
    
  if (error) throw new Error(`Failed to get friendship status: ${error.message}`);
  return data?.status || null;
}
