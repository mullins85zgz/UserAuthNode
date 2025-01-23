import express from 'express'
import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'

import { PORT, SECRET_JWT_KEY } from './config.js'
import { UserRepository } from './user-repository.js'

const app = express()

app.set('view engine', 'ejs')

app.use(express.json())
app.use(cookieParser())

app.use((req, res, next) => {
  const token = req.cookies.access_token
  let datos = null

  req.session = { user: null }
  try {
    datos = jwt.verify(token, SECRET_JWT_KEY)
    req.session.user = datos
  } catch (error) {}
  next()
})

app.get('/', (req, res) => {
  const user = req.session.user
  res.render('example', { name: user?.username })
})

app.post('/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const user = await UserRepository.login({ username, password })
    const token = jwt.sign({ id: user._id, username: user.username }, SECRET_JWT_KEY,
      { expiresIn: '1h' }
    )
    const refreshToken = jwt.sign({ id: user._id, username: user.username }, SECRET_JWT_KEY,
      { expiresIn: '7d' }
    )
    res.cookie('access_token', token, {
      httpOnly: true, // la cookie no puede ser leída por el cliente
      secure: process.env.NODE_ENV === 'production', // solo se envía en conexiones HTTPS
      sameSite: 'strict', // la cookie no se envía en peticiones de otros dominios
      maxAge: 1000 * 60 * 60 // tiempo de vida de la cookie en milisegundos. 1 hora
    }).send({ user, token })
    // res.json({ user })
  } catch (error) {
    res.status(401).json({ error: error.message })
  }
})

app.post('/register', async (req, res) => {
  const { username, password } = req.body
  console.log({ username, password })

  try {
    const id = await UserRepository.create({ username, password })
    res.json({ id })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})
app.post('/logout', (req, res) => {
  res.clearCookie('access_token').send('Logged out')
})

app.get('/protected', (req, res) => {
  const user = req.session.user
  if (!user) {
    return res.status(401).send('No tienes permisos')
  }

  try {
    res.render('protected', user)
  } catch (error) {
    return res.status(401).send('No tienes permisos')
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on URL http://localhost:${PORT}`)
})
