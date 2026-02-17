const express = require('express')
const db = require('../utils/db')
const { requireAdmin } = require('../middleware/auth')
const { clean } = require('../utils/sanitize')

const router = express.Router()

function slugify(input) {
  return clean(input)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\s\u2000-\u206F\u2E00-\u2E7F'"`~!@#$%^&*()+=|{}\[\]:;,.<>/?\\]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Дашборд
router.get('/', requireAdmin, async (req, res, next) => {
  try {
    const [[u]] = await db.query('SELECT COUNT(*) AS total FROM users')
    const [[p]] = await db.query('SELECT COUNT(*) AS total FROM posts')
    const [[c]] = await db.query('SELECT COUNT(*) AS total FROM comments')
    const [[cat]] = await db.query('SELECT COUNT(*) AS total FROM categories')
    const [[sec]] = await db.query('SELECT COUNT(*) AS total FROM sections')

    res.render('admin/index', {
      title: 'Админка',
      stats: {
        users: u.total,
        posts: p.total,
        comments: c.total,
        categories: cat.total,
        sections: sec.total,
      },
    })
  } catch (e) {
    next(e)
  }
})

// Категории
router.get('/categories', requireAdmin, async (req, res, next) => {
  try {
    const [categories] = await db.query('SELECT id, name, slug FROM categories ORDER BY name ASC')
    res.render('admin/categories', { title: 'Админка: категории', categories })
  } catch (e) {
    next(e)
  }
})

router.post('/categories/create', requireAdmin, async (req, res, next) => {
  try {
    // Создание категории
    const name = clean(req.body.name)
    const slug = clean(req.body.slug) || slugify(name)
    if (!name || !slug) {
      req.flash('error', 'Укажите название и slug')
      return res.redirect('/admin/categories')
    }
    await db.query('INSERT INTO categories (name, slug) VALUES (?,?)', [name, slug])
    req.flash('success', 'Категория создана')
    res.redirect('/admin/categories')
  } catch (e) {
    if (String(e?.code) === 'ER_DUP_ENTRY') {
      req.flash('error', 'Slug уже занят')
      return res.redirect('/admin/categories')
    }
    next(e)
  }
})

router.post('/categories/:id/update', requireAdmin, async (req, res, next) => {
  try {
    // Редактирование категории
    const id = Number(req.params.id)
    const name = clean(req.body.name)
    const slug = clean(req.body.slug) || slugify(name)
    if (!id || !name || !slug) {
      req.flash('error', 'Проверьте поля')
      return res.redirect('/admin/categories')
    }
    await db.query('UPDATE categories SET name=?, slug=? WHERE id=?', [name, slug, id])
    req.flash('success', 'Категория обновлена')
    res.redirect('/admin/categories')
  } catch (e) {
    if (String(e?.code) === 'ER_DUP_ENTRY') {
      req.flash('error', 'Slug уже занят')
      return res.redirect('/admin/categories')
    }
    next(e)
  }
})

router.post('/categories/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    // Удаление категории (нельзя, если в разделах есть посты)
    const id = Number(req.params.id)
    if (!id) return res.redirect('/admin/categories')

    const [[used]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM posts p
       JOIN sections s ON s.id=p.section_id
       WHERE s.category_id=?`,
      [id]
    )
    if (used.total > 0) {
      req.flash('error', 'Нельзя удалить категорию: в её разделах есть посты')
      return res.redirect('/admin/categories')
    }

    await db.query('DELETE FROM categories WHERE id=?', [id])
    req.flash('success', 'Категория удалена')
    res.redirect('/admin/categories')
  } catch (e) {
    next(e)
  }
})

// Разделы
router.get('/sections', requireAdmin, async (req, res, next) => {
  try {
    const [categories] = await db.query('SELECT id, name FROM categories ORDER BY name ASC')
    const [sections] = await db.query(
      `SELECT s.id, s.name, s.slug, s.category_id, c.name AS category_name
       FROM sections s
       JOIN categories c ON c.id=s.category_id
       ORDER BY c.name ASC, s.name ASC`
    )
    res.render('admin/sections', { title: 'Админка: разделы', categories, sections })
  } catch (e) {
    next(e)
  }
})

router.post('/sections/create', requireAdmin, async (req, res, next) => {
  try {
    // Создание раздела
    const categoryId = Number(req.body.category_id)
    const name = clean(req.body.name)
    const slug = clean(req.body.slug) || slugify(`${categoryId}-${name}`)
    if (!categoryId || !name || !slug) {
      req.flash('error', 'Проверьте поля')
      return res.redirect('/admin/sections')
    }
    await db.query('INSERT INTO sections (category_id, name, slug) VALUES (?,?,?)', [categoryId, name, slug])
    req.flash('success', 'Раздел создан')
    res.redirect('/admin/sections')
  } catch (e) {
    if (String(e?.code) === 'ER_DUP_ENTRY') {
      req.flash('error', 'Slug уже занят')
      return res.redirect('/admin/sections')
    }
    next(e)
  }
})

router.post('/sections/:id/update', requireAdmin, async (req, res, next) => {
  try {
    // Редактирование раздела
    const id = Number(req.params.id)
    const categoryId = Number(req.body.category_id)
    const name = clean(req.body.name)
    const slug = clean(req.body.slug) || slugify(`${categoryId}-${name}`)
    if (!id || !categoryId || !name || !slug) {
      req.flash('error', 'Проверьте поля')
      return res.redirect('/admin/sections')
    }
    await db.query('UPDATE sections SET category_id=?, name=?, slug=? WHERE id=?', [categoryId, name, slug, id])
    req.flash('success', 'Раздел обновлён')
    res.redirect('/admin/sections')
  } catch (e) {
    if (String(e?.code) === 'ER_DUP_ENTRY') {
      req.flash('error', 'Slug уже занят')
      return res.redirect('/admin/sections')
    }
    next(e)
  }
})

router.post('/sections/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    // Удаление раздела (нельзя, если в разделе есть посты)
    const id = Number(req.params.id)
    if (!id) return res.redirect('/admin/sections')

    const [[used]] = await db.query('SELECT COUNT(*) AS total FROM posts WHERE section_id=?', [id])
    if (used.total > 0) {
      req.flash('error', 'Нельзя удалить раздел: в нём есть посты')
      return res.redirect('/admin/sections')
    }
    await db.query('DELETE FROM sections WHERE id=?', [id])
    req.flash('success', 'Раздел удалён')
    res.redirect('/admin/sections')
  } catch (e) {
    next(e)
  }
})

// Пользователи
router.get('/users', requireAdmin, async (req, res, next) => {
  try {
    const [users] = await db.query(
      `SELECT u.id, u.username, u.email, u.role, u.created_at,
              (SELECT COUNT(*) FROM posts p WHERE p.user_id=u.id) AS posts_count,
              (SELECT COUNT(*) FROM comments cm WHERE cm.user_id=u.id) AS comments_count
       FROM users u
       ORDER BY u.created_at DESC`
    )
    res.render('admin/users', { title: 'Админка: пользователи', users })
  } catch (e) {
    next(e)
  }
})

router.post('/users/:id/role', requireAdmin, async (req, res, next) => {
  try {
    // Смена роли пользователя
    const id = Number(req.params.id)
    const role = clean(req.body.role)
    if (!id || !['user', 'admin'].includes(role)) return res.redirect('/admin/users')
    if (id === req.session.user.id) {
      req.flash('error', 'Нельзя менять роль самому себе')
      return res.redirect('/admin/users')
    }
    await db.query('UPDATE users SET role=? WHERE id=?', [role, id])
    req.flash('success', 'Роль обновлена')
    res.redirect('/admin/users')
  } catch (e) {
    next(e)
  }
})

router.post('/users/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    // Удаление пользователя
    const id = Number(req.params.id)
    if (!id) return res.redirect('/admin/users')
    if (id === req.session.user.id) {
      req.flash('error', 'Нельзя удалить самого себя')
      return res.redirect('/admin/users')
    }
    await db.query('DELETE FROM users WHERE id=?', [id])
    req.flash('success', 'Пользователь удалён')
    res.redirect('/admin/users')
  } catch (e) {
    next(e)
  }
})

// Посты
router.get('/posts', requireAdmin, async (req, res, next) => {
  try {
    const [posts] = await db.query(
      `SELECT p.id, p.title, p.created_at,
              u.id AS author_id, u.username AS author_username,
              c.name AS category_name, s.name AS section_name
       FROM posts p
       JOIN users u ON u.id=p.user_id
       JOIN sections s ON s.id=p.section_id
       JOIN categories c ON c.id=s.category_id
       ORDER BY p.created_at DESC
       LIMIT 200`
    )
    res.render('admin/posts', { title: 'Админка: посты', posts })
  } catch (e) {
    next(e)
  }
})

router.post('/posts/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    // Модерация: удаление любого поста
    const id = Number(req.params.id)
    if (!id) return res.redirect('/admin/posts')
    await db.query('DELETE FROM posts WHERE id=?', [id])
    req.flash('success', 'Пост удалён')
    res.redirect('/admin/posts')
  } catch (e) {
    next(e)
  }
})

module.exports = router
