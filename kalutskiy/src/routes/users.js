const express = require('express')
const db = require('../utils/db')

const router = express.Router()

// Публичный профиль пользователя + его посты
router.get('/:id', async (req, res, next) => {
  try {
    const userId = Number(req.params.id)
    if (!userId) return res.status(404).render('errors/404', { title: 'Пользователь не найден' })

    const [[user]] = await db.query(
      'SELECT id, username, avatar_url, bio, created_at FROM users WHERE id=? LIMIT 1',
      [userId]
    )

    if (!user) return res.status(404).render('errors/404', { title: 'Пользователь не найден' })

    const [[pCount]] = await db.query('SELECT COUNT(*) AS total FROM posts WHERE user_id=?', [userId])

    const [posts] = await db.query(
      `SELECT p.id, p.title, p.created_at,
              s.name AS section_name, c.name AS category_name
       FROM posts p
       JOIN sections s ON s.id=p.section_id
       JOIN categories c ON c.id=s.category_id
       WHERE p.user_id=?
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [userId]
    )

    res.render('users/profile', {
      title: `Профиль: ${user.username}`,
      user,
      posts,
      stats: { posts: pCount.total },
    })
  } catch (e) {
    next(e)
  }
})

module.exports = router
