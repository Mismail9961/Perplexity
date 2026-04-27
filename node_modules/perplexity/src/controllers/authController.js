import { supabase } from "../lib/supabase.js";

const signup = async (req, res) => {
    const { email, password, name } = req.body;
    const cleanEmail = email.replace(/^["']|["']$/g, '').trim();

    if (!cleanEmail || !password || !name) {
        return res.status(400).json({
            message: "All fields are required",
        });
    }
    try {
        const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
                data: {
                    name,
                },
            },
        });

        if (error) return res.status(400).json({ message: error.message });
        return res.status(200).json({
            message: "User created successfully",
            user: data.user,
            session: data.session,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    const cleanEmail = email.replace(/^["']|["']$/g, '').trim();
    
    if (!cleanEmail || !password) {
        return res.status(400).json({
            message: "All fields are required",
        });
    }
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
        });

        if (error) return res.status(400).json({ message: error.message });
        return res.status(200).json({
            message: "User logged in successfully",
            user: data.user,
            session: data.session,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};

const logout = async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) return res.status(400).json({ message: error.message });
        return res.status(200).json({ message: "User logged out successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};


const oauthSignIn = async (req, res) => {
    const { provider } = req.params; // 'google' or 'github'

    const validProviders = ['google', 'github'];
    if (!validProviders.includes(provider)) {
        return res.status(400).json({ message: "Invalid provider" });
    }

    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: process.env.OAUTH_REDIRECT_URL, // e.g. http://localhost:3000/auth/callback
            },
        });

        if (error) return res.status(400).json({ message: error.message });
        return res.status(200).json({ url: data.url });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const oauthCallback = async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ message: "Authorization code is required" });
    }

    try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) return res.status(400).json({ message: error.message });

        return res.status(200).json({
            message: "OAuth login successful",
            user: data.user,
            session: data.session,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export default {
    signup,
    login,
    logout,
    oauthSignIn,
    oauthCallback,
};
