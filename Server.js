const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const app = express();

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

  res.json({ qr: qrImage, expiraEn: segundosRestantes });
});

app.get('/verify/:id', (req, res) => {
  const { token } = req.query;
  const tienda = TIENDAS[req.params.id];

  const esValido = speakeasy.totp.verify({
    secret: tienda.secreta,
    encoding: 'base32',
    token: token,
    step: 30,
    window: 1
  });

  if (esValido) {
    res.send(`
      <div style="text-align:center; font-family:sans-serif; margin-top:50px;">
        <h1 style="color: #00E676;">✔ COMERCIO AUTÉNTICO Y EN VIVO</h1>
        <h2>${tienda.nombre}</h2>
        <p>Esta conexión cuenta con firma temporal de Verifik.</p>
      </div>
    `);
  } else {
    res.send(`
      <div style="text-align:center; font-family:sans-serif; margin-top:50px;">
        <h1 style="color: #FF3D00;">❌ CÓDIGO EXPIRADO O CAPTURA DETECTADA</h1>
        <p>Este código QR ya no es válido. La cuenta origen podría ser un clon falso.</p>
      </div>
    `);
  }
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Verifik - QR Dinámico</title>
      <style>
        body { display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif; background:#0f172a; color:white; }
        .card { background:#1e293b; padding:30px; border-radius:16px; text-align:center; border:2px solid #38bdf8; }
        img { width:220px; height:220px; border-radius:8px; margin:15px 0; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Verifik Shield</h2>
        <img id="qr" src="" alt="Cargando...">
        <div>Cambia en: <span id="timer">--</span>s</div>
      </div>
      <script>
        async function updateQR() {
          const res = await fetch('/api/qr/demo-tienda');
          const data = await res.json();
          document.getElementById('qr').src = data.qr;
          let time = data.expiraEn;
          
          const interval = setInterval(() => {
            time--;
            document.getElementById('timer').innerText = time;
            if(time <= 0) {
              clearInterval(interval);
              updateQR();
            }
          }, 1000);
        }
        updateQR();
      </script>
    </body>
    </html>
  `);
});

app.listen(3000, () => console.log('🚀 Verifik Core corriendo en http://localhost:3000'));