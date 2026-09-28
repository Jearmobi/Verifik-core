const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.static('public'));

// Base de datos de comercios en memoria (Estructura extendida)
const TIENDAS = {
  'demo-tienda': {
    nombre: 'Tienda Oficial Demo',
    rif: 'J-123456789',
    propietario: 'Jesús Moya',
    telefono: '+58 412-0000000',
    direccion: 'Centro Comercial Monagas Plaza, Maturín',
    categoria: 'Comercio General',
    colorMarca: '#2563eb', // Azul predeterminado
    secreta: 'KVKX2MTEOB4GHQ3KNURXG33L05CG2T2M',
    reputacion: { votosPositivos: 12, votosNegativos: 0 } // Base para auditoría comunitaria
  }
};

// 1. Endpoint para REGISTRAR un nuevo comercio dinámicamente
app.post('/api/merchants/register', (req, res) => {
  const { slug, nombre, rif, propietario, telefono, direccion, categoria, colorMarca } = req.body;

  if (!slug || !nombre || !rif) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: slug, nombre y rif.' });
  }

  const idNormalizado = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');

  if (TIENDAS[idNormalizado]) {
    return res.status(400).json({ error: 'El identificador de este comercio ya existe.' });
  }

  const nuevaSecreta = speakeasy.generateSecret({ length: 20 }).base32;

  TIENDAS[idNormalizado] = {
    nombre: nombre,
    rif: rif,
    propietario: propietario || 'No especificado',
    telefono: telefono || 'No especificado',
    direccion: direccion || 'Maturín, Monagas',
    categoria: categoria || 'General',
    colorMarca: colorMarca || '#2563eb',
    secreta: nuevaSecreta,
    reputacion: { votosPositivos: 1, votosNegativos: 0 }
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
    propietario: tienda.propietario,
    telefono: tienda.telefono,
    direccion: tienda.direccion,
    categoria: tienda.categoria,
    colorMarca: tienda.colorMarca,
    reputacion: tienda.reputacion,
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
      propietario: tienda.propietario,
      direccion: tienda.direccion,
      categoria: tienda.categoria,
      colorMarca: tienda.colorMarca,
      reputacion: tienda.reputacion,
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

// Endpoint para registrar votos de la comunidad desde client-verify
app.post('/api/merchants/:id/vote', (req, res) => {
  const tienda = TIENDAS[req.params.id];
  if (!tienda) {
    return res.status(404).json({ exito: false, mensaje: 'Tienda no encontrada' });
  }

  if (!tienda.reputacion) {
    tienda.reputacion = { votosPositivos: 0, votosNegativos: 0 };
  }

  tienda.reputacion.votosPositivos += 1;

  res.json({
    exito: true,
    mensaje: '¡Gracias! Tu confirmación fortalece la seguridad de la comunidad.',
    reputacion: tienda.reputacion
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Verifik corriendo en puerto ${PORT}`);
});
// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Verifik corriendo en puerto ${PORT}`);
});