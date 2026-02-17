const express = require('express')
const db = require('../utils/db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// Сохранённые посты
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.id
    const categoryId = Number(req.query.category || 0)
    const sectionId = Number(req.query.section || 0)

    const [categories] = await db.query('SELECT id, name FROM categories ORDER BY name')
    const secParams = []
    let secWhere = ''
    if (categoryId) {
      secWhere = 'WHERE category_id=?'
      secParams.push(categoryId)
    }
    const [sections] = await db.query(
      `SELECT id, category_id, name FROM sections ${secWhere} ORDER BY name`,
      secParams
    )

    const params = [userId]
    const where = []
    if (categoryId) {
      where.push('c.id=?')
      params.push(categoryId)
    }
    if (sectionId) {
      where.push('s.id=?')
      params.push(sectionId)
    }

    const whereSql = where.length ? `AND ${where.join(' AND ')}` : ''

    const [posts] = await db.query(
      `SELECT
         p.id, p.title, p.content, p.created_at,
         u.username AS author_username, u.avatar_url AS author_avatar,
         s.name AS section_name,
         c.name AS category_name
       FROM saved_posts sp
       JOIN posts p ON p.id=sp.post_id
       JOIN users u ON u.id=p.user_id
       JOIN sections s ON s.id=p.section_id
       JOIN categories c ON c.id=s.category_id
       WHERE sp.user_id=?
       ${whereSql}
       ORDER BY sp.created_at DESC`,
      params
    )

    res.render('saved/index', {
      title: 'Сохранённые',
      categories,
      sections,
      posts,
      filters: { categoryId, sectionId },
    })
  } catch (e) {
    next(e)
  }
})

module.exports = router
