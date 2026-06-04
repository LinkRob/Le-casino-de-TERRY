const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');

const app = express();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI; 

app.use(session({
    secret: 'zelda-secret-key-triforce',
    resave: false,
    saveUninitialized: true
}));

app.use(express.json());
const database = {};

app.get('/', (req, res) => {
    if (!req.session.user) {
        return res.send(`
            <body style="background:#0d0f12; color:white; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; margin:0;">
                <div style="text-align:center;">
                    <h1 style="color:#f1c40f;">🔺 TRIFORCE CASINO 🔺</h1>
                    <p style="color:#566573;">Connectez votre compte Discord pour accéder aux jeux d'Hyrule</p>
                    <a href="https://discord.com{CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify" 
                       style="background:#f1c40f; color:black; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:bold;">
                       Se connecter avec Discord
                    </a>
                </div>
            </body>
        `);
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/user', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Non connecté' });
    const userId = req.session.user.id;
    if (!database[userId]) {
        database[userId] = {
            username: req.session.user.username,
            solde: 100,
            parties: 0,
            victoires: 0,
            totalGagne: 0,
            dernierBonus: 0
        };
    }
    res.json(database[userId]);
});

app.post('/api/bonus', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Non connecté' });
    const userId = req.session.user.id;
    const joueur = database[userId];
    const maintenant = Date.now();
    if (maintenant - joueur.dernierBonus < 24 * 60 * 60 * 1000) {
        return res.status(400).json({ error: 'Revenez demain !' });
    }
    joueur.solde += 10;
    joueur.dernierBonus = maintenant;
    res.json(joueur);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/');
    try {
        const response = await axios.post('https://discord.com', new URLSearchParams({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI,
        }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

        const userResponse = await axios.get('https://discord.com', {
            headers: { Authorization: `Bearer ${response.data.access_token}` }
        });

        req.session.user = userResponse.data;
        res.redirect('/');
    } catch (error) {
        res.send("Erreur de connexion.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Casino en ligne !'));
