const express = require('express');
const path = require('path');
const speakeasy = require('speakeasy');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.redirect('/register');
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/verify', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

// Endpoint de registro mediante REST directo a Supabase
app.post(['/api/register', '/api/merchants/register'], async (req, res) => {
  try {
    const { id, tienda, rif, colorMarca, categoria, propietario, telefono, direccion } = req.body;

    const finalId = (id && id.trim() !== '') 
      ? id.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
      : (tienda ? tienda.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'tienda-' + Date.now());

    const secret = speakeasy.generateSecret({ length: 20 }).base32;

    const supabaseUrl = 'https://rwovnzlaqiqrmngitxo.supabase.co';
    const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3b3Z2bnpsYXFpcXJtbmdpdHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjM1MDMsImV4cCI6MjEwNjE5OTUwM30.XffoL0XBGKnjn3j-TcOKStP0RE-BBNsgaPUgq-B2orU';

    // Enviar datos usando fetch nativo con cabeceras explícitas para Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/merchants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: finalId,
        tienda: tienda,
        rif: rif,
        secret: secret,
        color_marca: colorMarca || '#2563eb',
        categoria: categoria || 'General',
        propietario: propietario || 'No especificado',
        telefono: telefono || 'No especificado',
        direccion: direccion || 'Maturín, Monagas'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ exito: false, mensaje: `Supabase REST Error: ${errorText}` });
    }

    res.json({
      exito: true,
      mensaje: 'Comercio registrado con éxito',
      tiendaId: finalId
    });
  } catch (err) {
    console.error('Error en el servidor:', err);
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor Verifik corriendo en puerto ${PORT}`);
});