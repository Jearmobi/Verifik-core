const express = require('express');
const path = require('path');
const https = require('https');

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

// Servir la vista de verificación (compatible con móviles y parámetros de URL)
app.get(['/verify', '/verify*'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

// Endpoint de registro directo usando HTTPS nativo
app.post(['/api/register', '/api/merchants/register'], (req, res) => {
  try {
    const { id, tienda, rif, colorMarca, categoria, propietario, telefono, direccion } = req.body;

    const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3b3Z2bnpsYXFpcXJtbmdpdHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjM1MDMsImV4cCI6MjEwNjE5OTUwM30.XffoL0XBGKnjn3j-TcOKStP0RE-BBNsgaPUgq-B2orU';

    const payload = JSON.stringify([{
      id: id ? id.toLowerCase().trim() : '',
      tienda,
      rif,
      color_marca: colorMarca,
      categoria,
      propietario,
      telefono,
      direccion
    }]);

    const options = {
      hostname: 'rwovvnzlaqiqrmngitxo.supabase.co',
      port: 443,
      path: '/rest/v1/merchants',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          return res.json({ exito: true, mensaje: 'Comercio registrado con éxito' });
        } else {
          return res.status(response.statusCode).json({ exito: false, error: data });
        }
      });
    });

    request.on('error', (err) => {
      res.status(500).json({ exito: false, mensaje: err.message });
    });

    request.write(payload);
    request.end();

  } catch (error) {
    res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
  }
});

// Endpoint para consultar un comercio por su ID
app.get('/api/merchants/:id', (req, res) => {
  const merchantId = req.params.id.toLowerCase().trim();

  const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3b3Z2bnpsYXFpcXJtbmdpdHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjM1MDMsImV4cCI6MjEwNjE5OTUwM30.XffoL0XBGKnjn3j-TcOKStP0RE-BBNsgaPUgq-B2orU';

  const options = {
    hostname: 'rwovvnzlaqiqrmngitxo.supabase.co',
    port: 443,
    path: `/rest/v1/merchants?id=eq.${encodeURIComponent(merchantId)}&select=*`,
    method: 'GET',
    headers: {
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`
    }
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

  request.on('error', (err) => {
    res.status(500).json({ exito: false, mensaje: err.message });
  });

  request.end();
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor Verifik corriendo en puerto ${PORT}`);
});