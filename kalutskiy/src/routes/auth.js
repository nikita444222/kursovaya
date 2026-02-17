const express = require('express')
const bcrypt = require('bcryptjs')
const db = require('../utils/db')
const { clean } = require('../utils/sanitize')

const router = express.Router()

// Регистрация
router.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Регистрация' })
})

router.post('/register', async (req, res, next) => {
  try {
    // Создание пользователя
    const username = clean(req.body.username)
    const email = clean(req.body.email).toLowerCase()
    const password = String(req.body.password || '')

    if (!username || !email || password.length < 6) {
      req.flash('error', 'Заполните поля. Пароль минимум 6 символов.')
      return res.redirect('/auth/register')
    }

    const [exists] = await db.query(
      'SELECT id FROM users WHERE email=? OR username=? LIMIT 1',
      [email, username]
    )
    if (exists.length) {
      req.flash('error', 'Пользователь с таким email или ником уже существует')
      return res.redirect('/auth/register')
    }

    const hash = await bcrypt.hash(password, 10)
    const [result] = await db.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?,?,?,?)',
      [username, email, hash, 'user']
    )

    req.session.user = { id: result.insertId, username, avatar_url: null, role: 'user' }
    req.flash('success', 'Добро пожаловать на форум!')
    res.redirect('/')
  } catch (e) {
    next(e)
  }
})

// Вход
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Вход' })
})

router.post('/login', async (req, res, next) => {
  try {
    // Авторизация
    const email = clean(req.body.email).toLowerCase()
    const password = String(req.body.password || '')

    const [rows] = await db.query(
      'SELECT id, username, avatar_url, role, password_hash FROM users WHERE email=? LIMIT 1',
      [email]
    )

    if (!rows.length) {
      req.flash('error', 'Неверный email или пароль')
      return res.redirect('/auth/login')
    }

    const user = rows[0]
    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) {
      req.flash('error', 'Неверный email или пароль')
      return res.redirect('/auth/login')
    }

    req.session.user = { id: user.id, username: user.username, avatar_url: user.avatar_url, role: user.role }
    req.flash('success', 'Вы вошли в аккаунт')
    res.redirect('/')
  } catch (e) {
    next(e)
  }
})

// Выход
router.post('/logout', (req, res) => {
  // Выход из сессии
  req.session.destroy(() => res.redirect('/'))
})

module.exports = router
