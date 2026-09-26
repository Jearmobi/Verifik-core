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

app.get('/verify', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

app.get('/verify/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verify.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Verifik corriendo en puerto ${PORT}`);
});

