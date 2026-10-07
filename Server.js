require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://rwovvnzlaqiqrmngitxo.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Servir vistas estáticas principales
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/verify', (req, res) => {
  res.sendFile(path.join(__dirname, 'verify.html'));
});

app.get('/client-verify', (req, res) => {
  res.sendFile(path.join(__dirname, 'client-verify.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// ==========================================
// RUTAS DE LA API (SUPABASE - COMERCIOS)
// ==========================================

// Obtener comercios
app.get('/api/merchants', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('merchants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error interno al consultar comercios' });
  }
});

// Registrar comercio
app.post('/api/merchants', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('merchants')
      .insert([req.body])
      .select();

    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al registrar comercio' });
  }
});

// Actualizar comercio por ID
app.put('/api/merchants/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('merchants')
      .update(req.body)
      .eq('id', req.params.id)
      .select();

    if (error) return res.status(400).json({ success: false, message: error.message });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error al actualizar comercio' });
  }
});

// ==========================================
// INTEGRACIÓN META WHATSAPP WEBHOOK
// ==========================================

// 1. Verificación GET obligatoria de Meta (Handshake con hub.challenge)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'Verifik2026';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Meta Webhook] Token verificado con éxito.');
    // Meta exige responder con el challenge en texto plano exacto
    return res.status(200).send(challenge);
  }

  console.warn('[Meta Webhook] Fallo de verificación de token.');
  return res.sendStatus(403);
});

// 2. Recepción de mensajes por POST y reenvío automático a n8n
app.post('/webhook', async (req, res) => {
  // Confirmamos recepción inmediata a Meta (evita reintentos por timeout)
  res.sendStatus(200);

  const payload = req.body;

  // Reenviar al webhook local de n8n
  try {
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://127.0.0.1:5678/webhook/whatsapp-incoming';

    await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('[Meta Webhook] Error al reenviar evento a n8n:', err.message);
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Verifik Shield corriendo en puerto ${PORT}`);
});