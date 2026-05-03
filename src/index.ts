/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type']
}))

app.get('/', (c) => {
  return c.text('API jalan')
})

//GET semua user
app.get('/users', async (c) => {
  const result = await c.env.DB.prepare(
    "SELECT * FROM users ORDER BY id DESC"
  ).all()

  return c.json(result.results)
})

//TAMBAH user
app.post('/users', async (c) => {
  const body = await c.req.json()
  const nama = body.nama

  if (!nama) {
    return c.json({ error: 'Nama kosong' }, 400)
  }

  await c.env.DB.prepare(
    "INSERT INTO users (nama) VALUES (?)"
  ).bind(nama).run()

  return c.json({ message: 'User ditambahkan' })
})

//UPDATE user
app.put('/users/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const nama = body.nama

  await c.env.DB.prepare(
    "UPDATE users SET nama = ? WHERE id = ?"
  ).bind(nama, id).run()

  return c.json({ message: 'User diupdate' })
})

//HAPUS user
app.delete('/users/:id', async (c) => {
  const id = Number(c.req.param('id'))

  await c.env.DB.prepare(
    "DELETE FROM users WHERE id = ?"
  ).bind(id).run()

  return c.json({ message: 'User dihapus' })
})

//tabung
app.post('/tabung', async (c) => {
  const body = await c.req.json()
  const user_id = body.user_id
  const jumlah = Number(body.jumlah)

  if (!user_id || !jumlah || jumlah <= 0) {
    return c.json({ error: 'Data tidak valid' }, 400)
  }

  // cek user ada atau tidak
const user = await c.env.DB.prepare(
  "SELECT * FROM users WHERE id = ?"
).bind(user_id).first()

if (!user) {
  return c.json({ error: "User tidak ditemukan" }, 400)
}

  await c.env.DB.prepare(
    "INSERT INTO transaksi (user_id, jumlah, tipe, created_at) VALUES (?, ?, 'masuk', datetime('now','+7 hours'))"
  ).bind(user_id, jumlah).run()

  return c.json({ message: 'Berhasil menabung' })
})


//tarik
app.post('/tarik', async (c) => {
  const body = await c.req.json()
  const user_id = body.user_id
  const jumlah = Number(body.jumlah)

  if (!user_id || !jumlah || jumlah <= 0) {
    return c.json({ error: "Data tidak valid" }, 400)
  }

  //cek user
  const user = await c.env.DB.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).bind(user_id).first()

  if (!user) {
    return c.json({ error: "User tidak ditemukan" }, 400)
  }

  //hitung saldo
  const saldoData = await c.env.DB.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN tipe='masuk' THEN jumlah ELSE 0 END),0) -
      COALESCE(SUM(CASE WHEN tipe='keluar' THEN jumlah ELSE 0 END),0)
      AS saldo
    FROM transaksi
    WHERE user_id = ?
  `).bind(user_id).first()

  const saldo = Number(saldoData?.saldo ?? 0)
//validasi saldo
if (jumlah > saldo) {
  return c.json({ error: "Saldo tidak cukup" }, 400)
}

  //kalau aman, lanjut tarik
  await c.env.DB.prepare(
    "INSERT INTO transaksi (user_id, jumlah, tipe, created_at) VALUES (?, ?, 'keluar', datetime('now','+7 hours'))"
  ).bind(user_id, jumlah).run()

  return c.json({ message: "Berhasil tarik" })
})

//saldo
app.get('/saldo/:user_id', async (c) => {
  const user_id = c.req.param('user_id') //string

  const result = await c.env.DB.prepare(`
    SELECT 
      COALESCE(SUM(CASE WHEN tipe='masuk' THEN jumlah ELSE 0 END),0) -
      COALESCE(SUM(CASE WHEN tipe='keluar' THEN jumlah ELSE 0 END),0)
      AS saldo
    FROM transaksi
    WHERE user_id = ?
  `).bind(user_id).first()

  return c.json({
    saldo: Number(result?.saldo) || 0
  })
})

//riwayat
app.get('/riwayat/:user_id', async (c) => {
  const user_id = c.req.param('user_id')

  const result = await c.env.DB.prepare(
    "SELECT * FROM transaksi WHERE user_id = ? ORDER BY id DESC"
  ).bind(user_id).all()

  return c.json(result.results)
})

//hapus
app.delete('/transaksi/:id', async (c) => {
  const id = Number(c.req.param('id'))

  await c.env.DB.prepare(
    "DELETE FROM transaksi WHERE id = ?"
  ).bind(id).run()

  return c.json({ message: 'Data berhasil dihapus' })
})

app.put('/transaksi/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const jumlah = Number(body.jumlah)

  await c.env.DB.prepare(
    "UPDATE transaksi SET jumlah = ? WHERE id = ?"
  ).bind(jumlah, id).run()

  return c.json({ message: "Berhasil update" })
})

export default {
  fetch: app.fetch
}