require('dotenv').config();
const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Inicializar cliente de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 1. Registro de Comercios
// 1. Registro de Comercios (Mapeo flexible de campos)
app.post(['/api/register', '/api/merchants/register'], async (req, res) => {
  const body = req.body;
  
  const id = body.id || body.slug || body.identificador;
  const tienda = body.tienda || body.nombre || body.nombreComercio;
  const rif = body.rif || body.rifComercio;
  const colorMarca = body.colorMarca || body.color || '#2563eb';
  const categoria = body.categoria || 'General';
  const propietario = body.propietario || body.responsable || 'No especificado';
  const telefono = body.telefono || 'No especificado';
  const direccion = body.direccion || 'Maturín, Monagas';

  if (!id || !tienda || !rif) {
    return res.status(400).json({ 
      exito: false, 
      mensaje: 'Faltan campos obligatorios: Identificador (slug), Nombre de la tienda o RIF' 
    });
  }

  // Generar secreto TOTP
  const secret = speakeasy.generateSecret({ length: 20 }).base32;

  const { data, error } = await supabase
    .from('merchants')
    .upsert({
      id,
      tienda,
      rif,
      secret,
      color_marca: colorMarca,
      categoria,
      propietario,
      telefono,
      direccion
    });

  if (error) {
    console.error('Error al guardar en Supabase:', error);
    return res.status(500).json({ exito: false, mensaje: 'Error al registrar en la base de datos' });
  }

  res.json({
    exito: true,
    mensaje: 'Comercio registrado con éxito',
    tiendaId: id
  });
});
  res.json({
    exito: true,
    mensaje: 'Comercio registrado con éxito en Supabase',
    tiendaId: id
  });
});

// 2. Obtener QR y Token
app.get('/api/qr/:id', async (req, res) => {
  const tiendaId = req.params.id;

  const { data: tienda, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', tiendaId)
    .single();

  if (error || !tienda) {
    return res.status(404).json({ error: 'Tienda no encontrada' });
  }

  const token = speakeasy.totp({
    secret: tienda.secret,
    encoding: 'base32'
  });

  const remainingSeconds = 30 - (Math.floor(Date.now() / 1000) % 30);
  const verifyUrl = `${req.protocol}://${req.get('host')}/verify/${tiendaId}?token=${token}`;
  const qrImage = await QRCode.toDataURL(verifyUrl);

  // Obtener conteo de votos positivos
  const { count } = await supabase
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('merchant_id', tiendaId);

  res.json({
    tienda: tienda.tienda,
    rif: tienda.rif,
    colorMarca: tienda.color_marca,
    categoria: tienda.categoria,
    propietario: tienda.propietario,
    telefono: tienda.telefono,
    direccion: tienda.direccion,
    reputacion: { votosPositivos: count || 0 },
    qr: qrImage,
    token: token,
    expiraEn: remainingSeconds
  });
});

// 3. Validar Token en cliente
app.get('/api/verify/:id', async (req, res) => {
  const tiendaId = req.params.id;
  const { token } = req.query;

  const { data: tienda, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', tiendaId)
    .single();

  if (error || !tienda) {
    return res.status(404).json({ valido: false, mensaje: 'Comercio no encontrado' });
  }

  const valido = speakeasy.totp.verify({
    secret: tienda.secret,
    encoding: 'base32',
    token: token,
    window: 1
  });

  if (valido) {
    res.json({
      valido: true,
      mensaje: 'Código verificado. Este comercio está activo y es auténtico.',
      tienda: tienda.tienda,
      propietario: tienda.propietario,
      direccion: tienda.direccion
    });
  } else {
    res.json({
      valido: false,
      mensaje: 'El código expiró o no pertenece a este comercio. Solicita el QR actualizado al vendedor.'
    });
  }
});

// 4. Registrar Votos
app.post('/api/merchants/:id/vote', async (req, res) => {
  const tiendaId = req.params.id;

  const { error } = await supabase
    .from('votes')
    .insert([{ merchant_id: tiendaId, voto_tipo: 'positivo' }]);

  if (error) {
    return res.status(500).json({ exito: false, mensaje: 'Error al registrar el voto' });
  }

  res.json({
    exito: true,
    mensaje: '¡Gracias! Tu confirmación fortalece la seguridad de la comunidad.'
  });
});

// Rutas de Vistas HTML
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

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor Verifik corriendo en puerto ${PORT}`);
});