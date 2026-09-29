const express = require('express');
const path = require('path');
const https = require('https');
const speakeasy = require('speakeasy');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de navegación
app.get('/', (req, res) => {
  res.redirect('/register');
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/verify', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

// Endpoint de registro directo usando HTTPS nativo (Evita errores de 'fetch failed')
app.post(['/api/register', '/api/merchants/register'], (req, res) => {
  try {
    const { id, tienda, rif, colorMarca, categoria, propietario, telefono, direccion } = req.body;

    const finalId = (id && id.trim() !== '') 
      ? id.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
      : (tienda ? tienda.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'tienda-' + Date.now());

    const secret = speakeasy.generateSecret({ length: 20 }).base32;

    const payload = JSON.stringify({
      id: finalId,
      tienda: tienda,
      rif: rif,
      secret: secret,
      color_marca: colorMarca || '#2563eb',
      categoria: categoria || 'General',
      propietario: propietario || 'No especificado',
      telefono: telefono || 'No especificado',
      direccion: direccion || 'Maturín, Monagas'
    });

    const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3b3Z2bnpsYXFpcXJtbmdpdHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjM1MDMsImV4cCI6MjEwNjE5OTUwM30.XffoL0XBGKnjn3j-TcOKStP0RE-BBNsgaPUgq-B2orU';

    const options = {
      hostname: 'rwovvnzlaqiqrmngitxo.supabase.co',
      port: 443,
      path: '/rest/v1/merchants',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Prefer': 'resolution=merge-duplicates'
      }
    };

    const request = https.request(options, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return res.json({
            exito: true,
            mensaje: 'Comercio registrado con éxito',
            tiendaId: finalId
          });
        } else {
          return res.status(500).json({
            exito: false,
            mensaje: `Error de Supabase (${response.statusCode}): ${data}`
          });
        }
      });
    });

    request.on('error', (error) => {
      console.error('Error HTTPS nativo:', error);
      return res.status(500).json({
        exito: false,
        mensaje: `Error de red HTTPS: ${error.message}`
      });
    });

    request.write(payload);
    request.end();

  } catch (err) {
    console.error('Excepción interna:', err);
    res.status(500).json({ exito: false, mensaje: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor Verifik corriendo en puerto ${PORT}`);
});