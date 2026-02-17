const express = require('express')
const db = require('../utils/db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// Мои посты: список, счетчик, быстрые действия
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.id
    const [countRows] = await db.query('SELECT COUNT(*) AS total FROM posts WHERE user_id=?', [userId])
    const total = countRows?.[0]?.total || 0

    const [posts] = await db.query(
      `SELECT p.id, p.title, p.created_at,
              s.name AS section_name,
              c.name AS category_name,
              (SELECT COUNT(*) FROM comments cm WHERE cm.post_id=p.id) AS comments_count
       FROM posts p
       JOIN sections s ON s.id=p.section_id
       JOIN categories c ON c.id=s.category_id
       WHERE p.user_id=?
       ORDER BY p.created_at DESC`,
      [userId]
    )

    res.render('my/index', {
      title: 'Мои посты',
      total,
      posts,
    })
  } catch (e) {
    next(e)
  }
})

module.exports = router
