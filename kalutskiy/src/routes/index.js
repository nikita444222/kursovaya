const express = require('express')
const db = require('../utils/db')

const router = express.Router()

// Главная: поиск, фильтры, категории/разделы, лента постов
router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    const categoryId = Number(req.query.category || 0)
    const sectionId = Number(req.query.section || 0)
    const page = Math.max(1, Number(req.query.page || 1))
    const limit = 10
    const offset = (page - 1) * limit

    const [categories] = await db.query(
      `SELECT id, name, slug FROM categories ORDER BY name ASC`
    )

    // Разделы можно фильтровать по категории
    const sectionParams = []
    let sectionWhere = ''
    if (categoryId) {
      sectionWhere = 'WHERE category_id=?'
      sectionParams.push(categoryId)
    }
    const [sections] = await db.query(
      `SELECT id, category_id, name, slug FROM sections ${sectionWhere} ORDER BY name ASC`,
      sectionParams
    )

    const params = []
    const where = []

    if (categoryId) {
      where.push('c.id=?')
      params.push(categoryId)
    }
    if (sectionId) {
      where.push('s.id=?')
      params.push(sectionId)
    }

    // Поиск
    if (q) {
      where.push(
        `(MATCH(p.title, p.content) AGAINST (? IN BOOLEAN MODE) OR p.title LIKE ? OR p.content LIKE ?)`
      )
      params.push(q)
      params.push(`%${q}%`)
      params.push(`%${q}%`)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const userId = req.session.user?.id || null

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM posts p
       JOIN sections s ON s.id=p.section_id
       JOIN categories c ON c.id=s.category_id
       ${whereSql}`,
      params
    )

    const total = countRows?.[0]?.total || 0
    const pages = Math.max(1, Math.ceil(total / limit))

    const listParams = [...params]
    listParams.push(limit, offset)

    // Флаг "в сохраненных" — только для авторизованных
    const savedJoin = userId
      ? 'LEFT JOIN saved_posts sp ON sp.post_id=p.id AND sp.user_id=' + db.escape(userId)
      : 'LEFT JOIN saved_posts sp ON 1=0'

    const [posts] = await db.query(
      `SELECT
          p.id, p.title, p.content, p.created_at,
          u.id AS author_id, u.username AS author_username, u.avatar_url AS author_avatar,
          s.id AS section_id, s.name AS section_name,
          c.id AS category_id, c.name AS category_name,
          (SELECT COUNT(*) FROM comments cm WHERE cm.post_id=p.id) AS comments_count,
          (sp.user_id IS NOT NULL) AS is_saved
       FROM posts p
       JOIN users u ON u.id=p.user_id
       JOIN sections s ON s.id=p.section_id
       JOIN categories c ON c.id=s.category_id
       ${savedJoin}
       ${whereSql}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      listParams
    )

    res.render('index', {
      title: 'DoggoForum — форум про собак',
      categories,
      sections,
      posts,
      filters: { q, categoryId, sectionId },
      pager: { page, pages, total },
    })
  } catch (e) {
    next(e)
  }
})

module.exports = router
