const express = require('express');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 10000;

const SUPABASE_HOST = process.env.SUPABASE_HOST || 'yvdexfuyqmsdxfkndoxg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Vistas HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'verify.html')));
app.get('/verify', (req, res) => res.sendFile(path.join(__dirname, 'public', 'verify.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// API: Obtener comercio por ID
app.get('/api/merchants/:id', (req, res) => {
  const merchantId = req.params.id.toLowerCase().trim().replace(/\s+/g, '-');

  const options = {
    hostname: SUPABASE_HOST,
    port: 443,
    path: `/rest/v1/merchants?id=eq.${encodeURIComponent(merchantId)}&select=*`,
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  };

  const request = https.request(options, (response) => {
    let data = '';
    response.on('data', (chunk) => data += chunk);
    response.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (response.statusCode === 200 && parsed.length > 0) {
          res.status(200).json({ exito: true, comercio: parsed[0] });
        } else {
          res.status(404).json({ exito: false, mensaje: 'Comercio no encontrado' });
        }
      } catch (e) {
        res.status(500).json({ exito: false, error: e.message });
      }
    });
  });

  request.on('error', (e) => res.status(500).json({ exito: false, error: e.message }));
  request.end();
});

// API: Listar todos los comercios (Para el Panel Admin)
app.get('/api/merchants', (req, res) => {
  const options = {
    hostname: SUPABASE_HOST,
    port: 443,
    path: '/rest/v1/merchants?select=*',
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  };

  const request = https.request(options, (response) => {
    let data = '';
    response.on('data', (chunk) => data += chunk);
    response.on('end', () => {
      try {
        res.status(200).json(JSON.parse(data));
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  });

  request.on('error', (e) => res.status(500).json({ error: e.message }));
  request.end();
});

// API: Registrar nuevo comercio
app.post(['/api/register', '/api/merchants/register'], (req, res) => {
  try {
    const {
      id, tienda, rif, colorMarca, categoria, propietario, telefono, direccion,
      instagram, maps_link, banco_pago_movil, cedula_pago_movil, telefono_pago_movil
    } = req.body;

    let nivelCalculado = 1;
    if (banco_pago_movil && cedula_pago_movil && telefono_pago_movil && instagram && direccion) {
      nivelCalculado = 2;
    }

    const payload = JSON.stringify([{
      id: id ? id.toLowerCase().trim().replace(/\s+/g, '-') : '',
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
      nivel_verificacion: nivelCalculado,
      secret: Math.random().toString(36).substring(2) + Date.now().toString(36)
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
        'Prefer': 'return=representation'
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => data += chunk);
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          res.status(200).json({ success: true, data: JSON.parse(data) });
        } else {
          res.status(response.statusCode).json({ success: false, error: data });
        }
      });
    });

    request.on('error', (e) => res.status(500).json({ success: false, error: e.message }));
    request.write(payload);
    request.end();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Actualizar comercio desde el Panel Admin
app.patch('/api/merchants/:id', (req, res) => {
  const merchantId = req.params.id;
  const payload = JSON.stringify(req.body);

  const options = {
    hostname: SUPABASE_HOST,
    port: 443,
    path: `/rest/v1/merchants?id=eq.${encodeURIComponent(merchantId)}`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation'
    }
  };

  const request = https.request(options, (response) => {
    let data = '';
    response.on('data', (chunk) => data += chunk);
    response.on('end', () => {
      res.status(response.statusCode).json({ success: response.statusCode < 300, data });
    });
  });

  request.on('error', (e) => res.status(500).json({ success: false, error: e.message }));
  request.write(payload);
  request.end();
});

app.listen(PORT, () => {
  console.log(`Verifik Core en ejecución en puerto ${PORT}`);
});