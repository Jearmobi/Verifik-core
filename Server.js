const express = require('express');
const path = require('path');
const https = require('https');

const app = express();

const SUPABASE_HOST = 'rwovvnzlaqiqrmngitxo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3b3Z2bnpsYXFpcXJtbmdpdHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjM1MDMsImV4cCI6MjEwNjE5OTUwM30.XffoL0XBGKnjn3j-TcOKStP0RE-BBNsgaPUgq-B2orU';

// CORS Universal para Navegadores Web y WebView (Instagram/WhatsApp)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, apikey');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de Navegación HTML
app.get('/', (req, res) => res.redirect('/register'));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get(/^\/verify/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'verify.html')));

// 1. ENDPOINT: Registro de Comercio con Nivel de Seguridad
app.post(['/api/register', '/api/merchants/register'], (req, res) => {
  try {
    const { 
      id, tienda, rif, colorMarca, categoria, propietario, telefono, direccion,
      instagram, maps_link, banco_pago_movil, cedula_pago_movil, telefono_pago_movil, nivel_verificacion
    } = req.body;

    const payload = JSON.stringify([{
      id: id ? id.toLowerCase().trim() : '',
      tienda,
      rif,
      color_marca: colorMarca || '#0284c7',
      categoria: categoria || 'General',
      propietario,
      telefono,
      direccion,
      instagram: instagram ? instagram.replace('@', '').trim() : '',
      maps_link: maps_link || '',
      banco_pago_movil: banco_pago_movil || '',
      cedula_pago_movil: cedula_pago_movil || '',
      telefono_pago_movil: telefono_pago_movil || '',
      nivel_verificacion: parseInt(nivel_verificacion) || 1
    }]);

    const options = {
      hostname: SUPABASE_HOST,
      port: 443,
      path: '/rest/v1/merchants',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return res.json({ exito: true, mensaje: 'Comercio registrado exitosamente con nivel de seguridad.' });
        } else {
          return res.status(response.statusCode).json({ exito: false, error: data });
        }
      });
    });

    request.on('error', (err) => res.status(500).json({ exito: false, mensaje: err.message }));
    request.write(payload);
    request.end();

  } catch (error) {
    res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
  }
});

// 2. ENDPOINT: Consulta Pública de Comercio por ID
app.get('/api/merchants/:id', (req, res) => {
  const merchantId = req.params.id.toLowerCase().trim();

  const options = {
    hostname: SUPABASE_HOST,
    port: 443,
    path: `/rest/v1/merchants?id=eq.${encodeURIComponent(merchantId)}&select=*`,
    method: 'GET',
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  };

  const request = https.request(options, (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => {
      try {
        const result = JSON.parse(data);
        if (Array.isArray(result) && result.length > 0) {
          return res.json({ exito: true, comercio: result[0] });
        } else {
          return res.status(404).json({ exito: false, mensaje: 'Comercio no encontrado' });
        }
      } catch (err) {
        return res.status(500).json({ exito: false, mensaje: 'Error parsing JSON' });
      }
    });
  });

  request.on('error', (err) => res.status(500).json({ exito: false, mensaje: err.message }));
  request.end();
});

// 3. ENDPOINT: Registrar Reportes / Denuncias
app.post('/api/reports', (req, res) => {
  try {
    const { merchant_id, motivo, contacto_denunciante } = req.body;

    const payload = JSON.stringify([{
      merchant_id,
      motivo,
      contacto_denunciante,
      fecha: new Date().toISOString()
    }]);

    const options = {
      hostname: SUPABASE_HOST,
      port: 443,
      path: '/rest/v1/reports',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const request = https.request(options, (response) => {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return res.json({ exito: true, mensaje: 'Reporte registrado para auditoría.' });
      }
      return res.status(400).json({ exito: false, mensaje: 'No se pudo procesar el reporte.' });
    });

    request.on('error', (err) => res.status(500).json({ exito: false, mensaje: err.message }));
    request.write(payload);
    request.end();

  } catch (error) {
    res.status(500).json({ exito: false, mensaje: 'Error al enviar reporte' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor Verifik ejecutándose en puerto ${PORT}`));