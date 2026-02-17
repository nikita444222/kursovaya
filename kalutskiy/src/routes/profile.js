const express = require('express')
const path = require('path')
const fs = require('fs')
const db = require('../utils/db')
const { requireAuth } = require('../middleware/auth')
const { uploadAvatar } = require('../middleware/upload')
const { clean } = require('../utils/sanitize')

const router = express.Router()

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.id

    const [[user]] = await db.query(
      'SELECT id, username, email, avatar_url, bio, created_at FROM users WHERE id=? LIMIT 1',
      [userId]
    )

    const [[pCount]] = await db.query('SELECT COUNT(*) AS total FROM posts WHERE user_id=?', [userId])
    const [[cCount]] = await db.query('SELECT COUNT(*) AS total FROM comments WHERE user_id=?', [userId])

    const [comments] = await db.query(
      `SELECT cm.id, cm.content, cm.created_at, p.id AS post_id, p.title AS post_title
       FROM comments cm
       JOIN posts p ON p.id=cm.post_id
       WHERE cm.user_id=?
       ORDER BY cm.created_at DESC
       LIMIT 20`,
      [userId]
    )

    res.render('profile/index', {
      title: 'Профиль',
      user,
      stats: { posts: pCount.total, comments: cCount.total },
      comments,
    })
  } catch (e) {
    next(e)
  }
})

router.get('/edit', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.id
    const [[user]] = await db.query('SELECT id, username, email, avatar_url, bio FROM users WHERE id=? LIMIT 1', [userId])
    res.render('profile/edit', { title: 'Настройки профиля', user })
  } catch (e) {
    next(e)
  }
})

router.post('/edit', requireAuth, (req, res, next) => {
  // Обновление данных профиля + загрузка аватара
  uploadAvatar(req, res, async (err) => {
    try {
      if (err) {
        req.flash('error', err.message || 'Ошибка загрузки файла')
        return res.redirect('/profile/edit')
      }

      const userId = req.session.user.id
      const username = clean(req.body.username)
      const bio = clean(req.body.bio)

      if (!username) {
        req.flash('error', 'Ник не может быть пустым')
        return res.redirect('/profile/edit')
      }

      const [exists] = await db.query(
        'SELECT id FROM users WHERE username=? AND id<>? LIMIT 1',
        [username, userId]
      )
      if (exists.length) {
        req.flash('error', 'Такой ник уже занят')
        return res.redirect('/profile/edit')
      }

      let avatarUrl = null
      if (req.file) {
        avatarUrl = `/${path.posix.join((process.env.UPLOAD_DIR || 'public/uploads').replace(/^public\//, ''), req.file.filename)}`

        // Удаление старого аватара (если он загружался локально)
        const [[u]] = await db.query('SELECT avatar_url FROM users WHERE id=? LIMIT 1', [userId])
        if (u?.avatar_url && u.avatar_url.startsWith('/uploads/')) {
          const oldPath = path.join(process.cwd(), 'public', u.avatar_url.replace(/^\//, ''))
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
        }
      }

      const fields = ['username=?', 'bio=?']
      const params = [username, bio]
      if (avatarUrl) {
        fields.push('avatar_url=?')
        params.push(avatarUrl)
      }
      params.push(userId)

      await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id=?`, params)

      // Обновление данных в сессии (для шапки/аватарки)
      req.session.user.username = username
      if (avatarUrl) req.session.user.avatar_url = avatarUrl

      req.flash('success', 'Профиль обновлён')
      res.redirect('/profile')
    } catch (e) {
      next(e)
    }
  })
})

module.exports = router
