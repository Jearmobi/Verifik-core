const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const path = require('path');
const app = express();
app.use(express.static('public'));
const TIENDAS = {
  'demo-tienda': {
    nombre: 'Tienda Oficial Demo',
    secreta: 'KVKX2MTEOB4GHQ3KNURXG33LO5CG2T2M'
  }
};

app.get('/api/qr/:id', async (req, res) => {
  const tienda = TIENDAS[req.params.id];
  if (!tienda) return res.status(404).send('Tienda no registrada');

  const token = speakeasy.totp({
    secret: tienda.secreta,
    encoding: 'base32',
    step: 30
  });

  const urlValidacion = `https://verifik-core.onrender.com/verify/${req.params.id}?token=${token}`;
  const qrImage = await QRCode.toDataURL(urlValidacion);
  const segundosRestantes = 30 - (Math.floor(Date.now() / 1000) % 30);

  res.json({ token: token, qr: qrImage, expiraEn: segundosRestantes });
});
// API para validar el token que envía el cliente al escanear
app.get('/api/verify/:id', (req, res) => {
  const { token } = req.query;
  const tienda = TIENDAS[req.params.id];

  if (!tienda) {
    return res.status(404).json({ 
      valido: false, 
      mensaje: 'Tienda no registrada en el sistema' 
    });
  }

  // Comprobar si el token de 6 dígitos es correcto
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
      rif: 'J-123456789',
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

// Ruta /verify
app.get('/verify', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

// Ruta /verify/:id (Servir pantalla de cliente si trae token, o pantalla de tienda si no)
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