import { supabase } from "../lib/supabase.js";
import { decryptApiKey, encryptApiKey } from "../services/llmKeyCrypto.js";

export async function createUserLlmKey({
  user_id,
  provider,
  api_key,
  model,
  base_url = null,
  name = null,
  is_default = false,
}) {
  if (is_default) {
    await supabase
      .from("user_llm_keys")
      .update({ is_default: false })
      .eq("user_id", user_id);
  }

  const encrypted_key = encryptApiKey(api_key);

  const { data, error } = await supabase
    .from("user_llm_keys")
    .insert({
      user_id,
      provider,
      encrypted_key,
      model,
      base_url,
      name,
      is_default,
      key_hint: `${api_key.slice(0, 4)}...${api_key.slice(-4)}`,
    })
    .select("id, user_id, provider, model, base_url, name, is_default, key_hint, created_at")
    .single();

  if (error) throw error;
  return data;
}

export async function getUserLlmKeys(userId) {
  const { data, error } = await supabase
    .from("user_llm_keys")
    .select("id, provider, model, base_url, name, is_default, key_hint, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function deleteUserLlmKey(userId, keyId) {
  const { error } = await supabase
    .from("user_llm_keys")
    .delete()
    .eq("user_id", userId)
    .eq("id", keyId);

  if (error) throw error;
}

export async function getDefaultLlmConfig(userId) {
  const { data, error } = await supabase
    .from("user_llm_keys")
    .select("provider, encrypted_key, model, base_url")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    provider: data.provider,
    apiKey: decryptApiKey(data.encrypted_key),
    model: data.model,
    baseUrl: data.base_url,
  };
}

export async function getUserLlmConfigById(userId, keyId) {
  const { data, error } = await supabase
    .from("user_llm_keys")
    .select("provider, encrypted_key, model, base_url")
    .eq("user_id", userId)
    .eq("id", keyId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    provider: data.provider,
    apiKey: decryptApiKey(data.encrypted_key),
    model: data.model,
    baseUrl: data.base_url,
  };
}
