import { supabase } from "../lib/supabase.js";

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;

  if (!token) {
    return res.status(401).json({ message: "Missing Bearer token" });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.user = data.user;
    return next();
  } catch (error) {
    return res.status(500).json({
      message: "Authentication failed",
      error: error.message,
    });
  }
}
