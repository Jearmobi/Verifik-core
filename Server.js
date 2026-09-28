const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const path = require('path');

const app = express();

// Middleware para procesar JSON en el cuerpo de las peticiones
app.use(express.json());
app.use(express.static('public'));

// Base de datos de comercios en memoria
const TIENDAS = {
  'demo-tienda': {
    nombre: 'Tienda Oficial Demo',
    rif: 'J-123456789',
    secreta: 'KVKX2MTEOB4GHQ3KNURXG33L05CG2T2M'
  }
};

// 1. Endpoint para REGISTRAR un nuevo comercio dinámicamente
app.post('/api/merchants/register', (req, res) => {
  const { slug, nombre, rif } = req.body;

  if (!slug || !nombre || !rif) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: slug, nombre y rif.' });
  }

  // Normalizar el slug (ej: "Farmacia San José" -> "farmacia-san-jose")
  const idNormalizado = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

  if (TIENDAS[idNormalizado]) {
    return res.status(400).json({ error: 'El identificador de este comercio ya existe.' });
  }

  // Generar una clave secreta única en formato Base32
  const nuevaSecreta = speakeasy.generateSecret({ length: 20 }).base32;

  // Guardar el comercio
  TIENDAS[idNormalizado] = {
    nombre: nombre,
    rif: rif,
    secreta: nuevaSecreta
  };

  res.json({
    exito: true,
    mensaje: 'Comercio registrado exitosamente',
    comercio: {
      id: idNormalizado,
      nombre: nombre,
      rif: rif,
      urlPantalla: `https://verifik-core.onrender.com/verify/${idNormalizado}`
    }
  });
});

// 2. Endpoint que genera los datos del QR y Token dinámicamente
app.get('/api/qr/:id', async (req, res) => {
  const tienda = TIENDAS[req.params.id];
  if (!tienda) return res.status(404).json({ error: 'Tienda no registrada' });

  const token = speakeasy.totp({
    secret: tienda.secreta,
    encoding: 'base32',
    step: 30
  });

  const urlValidacion = `https://verifik-core.onrender.com/verify/${req.params.id}?token=${token}`;
  const qrImage = await QRCode.toDataURL(urlValidacion);
  const segundosRestantes = 30 - (Math.floor(Date.now() / 1000) % 30);

  res.json({
    tienda: tienda.nombre,
    rif: tienda.rif,
    token: token,
    qr: qrImage,
    expiraEn: segundosRestantes
  });
});

// 3. API para validar el token que envía el cliente
app.get('/api/verify/:id', (req, res) => {
  const { token } = req.query;
  const tienda = TIENDAS[req.params.id];

  if (!tienda) {
    return res.status(404).json({ 
      valido: false, 
      mensaje: 'Tienda no registrada en el sistema' 
    });
  }

  const esValido = speakeasy.totp.verify({
    secret: tienda.secreta,
    encoding: 'base32',
    token: token,
    step: 30,
    window: 1
  });

  if (esValido) {
    res.json({
      valido: true,
      tienda: tienda.nombre,
      rif: tienda.rif,
      mensaje: 'Comercio Auténtico y Conexión Segura'
    });
  } else {
    res.json({
      valido: false,
      tienda: tienda.nombre,
      mensaje: 'Código expirado o posible captura de pantalla no autorizada'
    });
  }
});

// Rutas de Vistas
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/verify', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

app.get('/verify/:id', (req, res) => {
  if (req.query.token) {
    res.sendFile(path.join(__dirname, 'public', 'client-verify.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'verify.html'));
  }
});
app.get('/verify/:id', (req, res) => {
  if (req.query.token) {
    res.sendFile(path.join(__dirname, 'public', 'client-verify.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'verify.html'));
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Verifik corriendo en puerto ${PORT}`);
});